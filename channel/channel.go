package channel

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/teacat/chaturbate-dvr/entity"
	"github.com/teacat/chaturbate-dvr/internal"
	"github.com/teacat/chaturbate-dvr/server"
)

// Channel represents a channel instance.
type Channel struct {
	CancelFunc context.CancelFunc
	LogCh      chan string
	UpdateCh   chan bool

	IsOnline          bool
	IsQueued          bool
	IsResetting       bool
	IsChecking        bool
	WantsToCancel     bool
	IsBlocked         bool   // Used for blocking channels
	LowresPlaylistURL string // Used for blocking channels
	StreamedAt        int64
	Duration          float64 // Seconds
	Filesize          int     // Bytes
	Sequence          int

	Logs []string

	File   *os.File
	Config *entity.ChannelConfig

	//PublishFunc func(event string, data *entity.ChannelInfo)
}

// New creates a new channel instance with the given manager and configuration.
func New(conf *entity.ChannelConfig) *Channel {
	ch := &Channel{
		LogCh:      make(chan string),
		UpdateCh:   make(chan bool),
		Config:     conf,
		CancelFunc: func() {},
	}
	go ch.Publisher()

	return ch
}

// Publisher listens for log messages and updates from the channel
// and publishes once received.
func (ch *Channel) Publisher() {
	for {
		select {
		case v := <-ch.LogCh:
			// Append the log message to ch.Logs and keep only the last 100 rows
			ch.Logs = append(ch.Logs, v)
			if len(ch.Logs) > 100 {
				ch.Logs = ch.Logs[len(ch.Logs)-100:]
			}
			server.Manager.Publish(entity.EventLog, ch.ExportInfo())

		case <-ch.UpdateCh:
			server.Manager.Publish(entity.EventUpdate, ch.ExportInfo())
		}
	}
}

// WithCancel creates a new context with a cancel function,
// then stores the cancel function in the channel's CancelFunc field.
//
// This is used to cancel the context when the channel is stopped or paused.
func (ch *Channel) WithCancel(ctx context.Context) (context.Context, context.CancelFunc) {
	ctx, ch.CancelFunc = context.WithCancel(ctx)
	log.Printf(" INFO [%s] %s", ch.Config.Username, "STOP") // <-- is this firing at the intended time?
	return ctx, ch.CancelFunc
}

// Info logs an informational message.
func (ch *Channel) Info(format string, a ...any) {
	ch.LogCh <- fmt.Sprintf("%s [INFO] %s", time.Now().Format("15:04"), fmt.Sprintf(format, a...))
	log.Printf(" INFO [%s] %s", ch.Config.Username, fmt.Sprintf(format, a...))
}

// Error logs an error message.
func (ch *Channel) Error(format string, a ...any) {
	ch.LogCh <- fmt.Sprintf("%s [ERROR] %s", time.Now().Format("15:04"), fmt.Sprintf(format, a...))
	log.Printf("ERROR [%s] %s", ch.Config.Username, fmt.Sprintf(format, a...))
}

// ExportInfo exports the channel information as a ChannelInfo struct.
func (ch *Channel) ExportInfo() *entity.ChannelInfo {
	var filename string
	if ch.File != nil {
		filename = ch.File.Name()
	}
	var streamedAt string
	if ch.StreamedAt != 0 {
		streamedAt = time.Unix(ch.StreamedAt, 0).Format("2006-01-02 15:04 AM")
		ch.Config.RecordedAt = ch.StreamedAt /*lil-bandit*/
	}

	return &entity.ChannelInfo{
		IsOnline:     ch.IsOnline,
		IsPaused:     ch.Config.IsPaused,
		IsQueued:     ch.IsQueued,
		IsBlocked:    ch.IsBlocked,
		Username:     ch.Config.Username,
		MaxDuration:  internal.FormatDuration(float64(ch.Config.MaxDuration * 60)),      // MaxDuration from config is in minutes
		MaxFilesize:  internal.FormatFilesize(ch.Config.MaxFilesize * 1024 * 1024), // MaxFilesize from config is in MB
		StreamedAt:   streamedAt,
		CreatedAt:    ch.Config.CreatedAt,
		Duration:     internal.FormatDuration(ch.Duration),
		Filesize:     internal.FormatFilesize(ch.Filesize),
		Filename:     filename,
		Logs:         ch.Logs,
		GlobalConfig: server.Config,

		/* < lil-bandit */
		Framerate:         ch.Config.Framerate,
		Resolution:        ch.Config.Resolution,
		Pattern:           ch.Config.Pattern,
		Priority:          ch.Config.Priority,
		FilesizeBytes:     ch.Filesize,
		StreamedAtUnix:    ch.StreamedAt,
		MaxFilesizeInt:    ch.Config.MaxFilesize,
		MaxDurationInt:    ch.Config.MaxDuration,
		LowresPlaylistURL: ch.LowresPlaylistURL,
		/* > lil-bandit */

		//DurationInt:    ch.Duration,
		//MinFilesize:       internal.FormatFilesize(ch.Config.MinFilesize * 1024 * 1024), // MinFilesize from config is in MB
	}
}

func (ch *Channel) BumpQueue(seq int) {
	if ch.IsResetting || !ch.IsQueued || ch.IsOnline {
		return
	}
	// This only matters for channels that are queued and not recording
	ch.IsResetting = true
	ch.CancelFunc()
	<-time.After(time.Duration(seq) * time.Millisecond * 50)
	ch.IsResetting = false
	go ch.Monitor()
}

func (ch *Channel) Queue(seq int) {
	if !ch.IsOnline || ch.IsQueued {
		return
	}
	// This will make handleSegment "cancel" the file
	ch.IsQueued = true

	/*
		<-time.After(time.Duration(seq) * time.Millisecond * 50)
		if ch.IsOnline {
			ch.IsQueued = true
		}
	*/
}

/*
func (ch *Channel) Reset() {
	if ch.IsResetting {
		return
	}
	ch.IsResetting = true
	if ch.IsOnline && ch.Duration < 3 {
		// Extra safe guard
		return
	}

	fmt.Printf("🔄 Reset() instance: %p Username: %s\n", ch, ch.Config.Username)
	ch.Info("Reset [%s]", ch.Config.Username)

	// Cancel any ongoing monitoring and signal that we’re prepping for reset
	ch.CancelFunc()

	if ch.IsOnline {
		// Wait for channel to go offline before resuming monitor
		ch.IsQueued = true
		deadline := time.Now().Add(30 * time.Second)
		for time.Now().Before(deadline) {
			if !ch.IsOnline && ch.Filesize == 0 && ch.IsResetting {
				go ch.Monitor()
				return
			} else {
				//try again
			}
			fmt.Printf("⌛ Channel: %s is still active\n", ch.Config.Username)
			time.Sleep(2000 * time.Millisecond)
		}
		fmt.Println("❌ Timeout: Channel did not go offline in time.")
	} else {
		go ch.Monitor()
	}
}
*/
// Pause pauses the channel and cancels the context.
func (ch *Channel) Pause() {
	// Stop the monitoring loop
	ch.CancelFunc()

	ch.Config.IsPaused = true // This will stop active recording
	ch.IsQueued = false
	ch.IsBlocked = false
	ch.Update()
	ch.Info("channel paused")
}

// Stop stops the channel and cancels the context.
func (ch *Channel) Stop() {
	// Stop the monitoring loop
	ch.CancelFunc()
	ch.Info("channel stopped")
}

// Resume resumes the channel monitoring.
//
// `startSeq` is used to prevent all channels from starting at the same time, preventing TooManyRequests errors.
// It's only be used when program starting and trying to resume all channels at once.
func (ch *Channel) Resume(startSeq int) {
	ch.Info("channel resumed")

	ch.Config.IsPaused = false

	ch.Update()

	<-time.After(time.Duration(startSeq) * time.Second)
	go ch.Monitor()
}
