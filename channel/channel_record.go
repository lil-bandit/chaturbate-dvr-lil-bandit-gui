package channel

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/avast/retry-go/v4"
	"github.com/teacat/chaturbate-dvr/chaturbate"
	"github.com/teacat/chaturbate-dvr/internal"
	"github.com/teacat/chaturbate-dvr/server"
)

// Monitor starts monitoring the channel for live streams and records them.
func (ch *Channel) Monitor() {
	client := chaturbate.NewClient()
	ch.Info("starting to monitor `%s`", ch.Config.Username)

	// Create a new context with a cancel function,
	// the CancelFunc will be stored in the channel's CancelFunc field
	// and will be called by `Pause` or `Stop` functions
	ctx, _ := ch.WithCancel(context.Background())

	var err error
	for {

		if err = ctx.Err(); err != nil {
			break
		}

		pipeline := func() error {
			return ch.RecordStream(ctx, client)
		}
		onRetry := func(_ uint, err error) {
			ch.IsBlocked = false
			ch.IsDownPrioritized = false
			ch.IsOnline = false // not sure this is needed

			// Possible fix to #114 0KB bug
			if err := ch.Cleanup(); err != nil {
				ch.Error("cleanup on retry: %v", err)
			}

			if errors.Is(err, internal.ErrDownPrioritized) {
				ch.IsDownPrioritized = true
				ch.Info("Waiting for slot: retrying in %d min(s)", server.Config.Interval)
			} else if errors.Is(err, internal.ErrChannelOffline) {
				ch.Info("channel is offline, try again in %d min(s)", server.Config.Interval)
			} else if errors.Is(err, internal.ErrCloudflareBlocked) {
				ch.IsBlocked = true
				ch.Info("channel was blocked by Cloudflare; try with `-cookies` and `-user-agent`? try again in %d min(s)", server.Config.Interval)
			} else if errors.Is(err, context.Canceled) {
				// ...
			} else {
				ch.Error("on retry: %s: retrying in %d min(s)", err.Error(), server.Config.Interval)
			}
			ch.Update()
		}
		if err = retry.Do(
			pipeline,
			retry.Context(ctx),
			retry.Attempts(0),
			retry.Delay(time.Duration(server.Config.Interval)*time.Minute),
			retry.DelayType(retry.FixedDelay),
			retry.OnRetry(onRetry),
		); err != nil {
			break
		} else {
			ch.Error("RECORDING RIGHT? or finished")
		}
	}

	if err != nil {
		if !errors.Is(err, context.Canceled) {
			ch.Error("record stream: %s", err.Error())
		}

		if err := ch.Cleanup(); err != nil {
			ch.Error("cleanup canceled channel: %s", err.Error())
		}
	}
}

// Update sends an update signal to the channel's update channel.
// This notifies the Server-sent Event to broadcast the channel information to the client.
func (ch *Channel) Update() {
	ch.UpdateCh <- true
}

// RecordStream records the stream of the channel using the provided client.
// It retrieves the stream information and starts watching the segments.
func (ch *Channel) RecordStream(ctx context.Context, client *chaturbate.Client) error {
	stream, err := client.GetStream(ctx, ch.Config.Username)

	if err != nil {
		ch.IsOnline = false
		return fmt.Errorf("get stream: %w", err)
	}

	/* Priority management */
	canStart := server.Manager.PreemptForPriority(ch.Config.Priority)
	if !canStart {
		ch.Info("Channel is online, but maximum connections reached or priority too low. Retrying in %d min(s)...", server.Config.Interval)
		return internal.ErrDownPrioritized // or define your own error
	}
	ch.IsBlocked = false
	ch.IsOnline = true
	ch.StreamedAt = time.Now().Unix()

	if err := ch.NextFile(); err != nil {
		return fmt.Errorf("next file: %w", err)
	}

	playlist, err := stream.GetPlaylist(ctx, ch.Config.Resolution, ch.Config.Framerate)
	if err != nil {
		return fmt.Errorf("get playlist: %w", err)
	}

	ch.Info("stream quality - resolution %dp (target: %dp), framerate %dfps (target: %dfps)", playlist.Resolution, ch.Config.Resolution, playlist.Framerate, ch.Config.Framerate)

	return playlist.WatchSegments(ctx, ch.HandleSegment)
}

// HandleSegment processes and writes segment data to a file.
func (ch *Channel) HandleSegment(b []byte, duration float64) error {
	if ch.Config.IsPaused {
		return retry.Unrecoverable(internal.ErrPaused)
	}

	n, err := ch.File.Write(b)
	if err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	ch.Filesize += n
	ch.Duration += duration
	ch.Info("duration: %s, filesize: %s", internal.FormatDuration(ch.Duration), internal.FormatFilesize(ch.Filesize))

	// Send an SSE update to update the view
	ch.Update()

	if ch.ShouldSwitchFile() {
		if err := ch.NextFile(); err != nil {
			return fmt.Errorf("next file: %w", err)
		}
		ch.Info("max filesize or duration exceeded, new file created: %s", ch.File.Name())
		return nil
	}
	return nil
}
