package manager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/r3labs/sse/v2"
	"github.com/teacat/chaturbate-dvr/channel"
	"github.com/teacat/chaturbate-dvr/entity"
	"github.com/teacat/chaturbate-dvr/router/view"
	"github.com/teacat/chaturbate-dvr/server"
)

// Manager is responsible for managing channels and their states.
type Manager struct {
	Channels sync.Map
	SSE      *sse.Server
}

// New initializes a new Manager instance with an SSE server.
func New() (*Manager, error) {

	server := sse.New()
	server.SplitData = true

	updateStream := server.CreateStream("updates")
	updateStream.AutoReplay = false

	return &Manager{
		SSE: server,
	}, nil
}

// SaveConfig saves the current channels and state to a JSON file.
func (m *Manager) SaveConfig() error {
	var config []*entity.ChannelConfig

	m.Channels.Range(func(key, value any) bool {
		config = append(config, value.(*channel.Channel).Config)
		return true
	})

	b, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	if err := os.MkdirAll("./conf", 0777); err != nil {
		return fmt.Errorf("mkdir all conf: %w", err)
	}
	if err := os.WriteFile("./conf/channels.json", b, 0777); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

// LoadConfig loads the channels from JSON and starts them.
func (m *Manager) LoadConfig() error {
	b, err := os.ReadFile("./conf/channels.json")
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read file: %w", err)
	}

	var config []*entity.ChannelConfig
	if err := json.Unmarshal(b, &config); err != nil {
		return fmt.Errorf("unmarshal: %w", err)
	}

	for i, conf := range config {
		ch := channel.New(conf)
		m.Channels.Store(conf.Username, ch)

		if ch.Config.IsPaused {
			ch.Info("channel was paused, waiting for resume")
			continue
		}
		go ch.Resume(i)
	}
	return nil
}

// CreateChannel starts monitoring an M3U8 stream
func (m *Manager) CreateChannel(conf *entity.ChannelConfig, shouldSave bool, seq int) error {
	conf.Sanitize()
	ch := channel.New(conf)

	// prevent duplicate channels
	_, ok := m.Channels.Load(conf.Username)
	if ok {
		return fmt.Errorf("channel %s already exists", conf.Username)
	}
	m.Channels.Store(conf.Username, ch)
	m.DownloadChannelImage(conf.Username)
	go ch.Resume(seq)

	if shouldSave {
		if err := m.SaveConfig(); err != nil {
			return fmt.Errorf("save config: %w", err)
		}
	}
	return nil
}

// StopChannel stops the channel.
func (m *Manager) StopChannel(username string) error {
	thing, ok := m.Channels.Load(username)
	if !ok {
		return nil
	}
	thing.(*channel.Channel).Stop()
	m.Channels.Delete(username)

	if err := m.SaveConfig(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	return nil
}

// PauseChannel pauses the channel.
func (m *Manager) PauseChannel(username string) error {
	thing, ok := m.Channels.Load(username)
	if !ok {
		return nil
	}
	thing.(*channel.Channel).Pause()

	if err := m.SaveConfig(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	return nil
}

// ResumeChannel resumes the channel.
func (m *Manager) ResumeChannel(username string) error {
	thing, ok := m.Channels.Load(username)
	if !ok {
		return nil
	}
	thing.(*channel.Channel).Resume(0)

	if err := m.SaveConfig(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	return nil
}

// ChannelInfo returns a list of channel information for the web UI.
func (m *Manager) ChannelInfo() []*entity.ChannelInfo {
	var channels []*entity.ChannelInfo

	// Iterate over the channels and append their information to the slice
	m.Channels.Range(func(key, value any) bool {
		channels = append(channels, value.(*channel.Channel).ExportInfo())
		return true
	})

	sort.Slice(channels, func(i, j int) bool {
		return channels[i].CreatedAt > channels[j].CreatedAt
	})

	return channels
}

// Publish sends an SSE event to the specified channel.
func (m *Manager) Publish(evt entity.Event, info *entity.ChannelInfo) {
	switch evt {
	case entity.EventUpdate:
		var b bytes.Buffer
		if err := view.InfoTpl.ExecuteTemplate(&b, "channel_info", info); err != nil {
			fmt.Println("Error executing template:", err)
			return
		}
		m.SSE.Publish("updates", &sse.Event{
			Event: []byte(info.Username + "-info"),
			Data:  b.Bytes(),
		})
	case entity.EventLog:
		m.SSE.Publish("updates", &sse.Event{
			Event: []byte(info.Username + "-log"),
			Data:  []byte(strings.Join(info.Logs, "\n")),
		})
	}
}

// Subscriber handles SSE subscriptions for the specified channel.
func (m *Manager) Subscriber(w http.ResponseWriter, r *http.Request) {
	m.SSE.ServeHTTP(w, r)
}

func (m *Manager) SaveServerConfig() error {
	appCfg := entity.AppConfig{
		Framerate:       server.Config.Framerate,
		Resolution:      server.Config.Resolution,
		Pattern:         server.Config.Pattern,
		MaxDuration:     server.Config.MaxDuration,
		MaxFilesize:     server.Config.MaxFilesize,
		MinFilesize:     server.Config.MinFilesize,
		MaxConnections:  server.Config.MaxConnections,
		PersistSettings: server.Config.PersistSettings,
		OutputDir:       server.Config.OutputDir,
		Port:            server.Config.Port,
		Interval:        server.Config.Interval,
		Cookies:         server.Config.Cookies,
		UserAgent:       server.Config.UserAgent,
		Domain:          server.Config.Domain,
	}

	b, err := json.MarshalIndent(appCfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	if err := os.MkdirAll("./conf", 0777); err != nil {
		return fmt.Errorf("mkdir all conf: %w", err)
	}
	if err := os.WriteFile("./conf/persisted-settings.json", b, 0777); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

func (m *Manager) DeleteServerConfig() error {
	err := os.Remove("./conf/persisted-settings.json")
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete file: %w", err)
	}
	return nil
}

func (m *Manager) PreemptForPriority(newPriority int) (canStart bool) {
	max := server.Config.MaxConnections
	if max < 1 {
		return true // unlimited, always allow
	}

	var (
		count          int
		lowestPrio     = int(^uint(0) >> 1) // max int
		highestPrio    = 0                  // max int
		lowestChannel  *channel.Channel
		highestChannel *channel.Channel
	)

	// Count online channels and find the lowest priority channel that we can potentially stop/preempt
	m.Channels.Range(func(key, value any) bool {
		ch := value.(*channel.Channel)
		if ch.IsOnline {
			count++
			if ch.Config.Priority < lowestPrio {
				lowestPrio = ch.Config.Priority
				lowestChannel = ch
			}
		}
		return true
	})

	if count < max {
		return true // slot available, no need to preempt
	}

	// Find the highest priority channel amongst queued (IsDownPrioritized == true) channels, that can potentially wait for to start instead
	m.Channels.Range(func(key, value any) bool {
		ch := value.(*channel.Channel)
		if ch.IsDownPrioritized {
			if ch.Config.Priority > highestPrio {
				highestPrio = ch.Config.Priority
				highestChannel = ch
			}
		}
		return true
	})

	// If the new channel's priority is higher than the lowest online channel's priority, and either there is no higher priority channel waiting or the new channel's priority is higher than the highest waiting channel's priority, we can down-prioritize the lowest online channel
	if newPriority > lowestPrio && lowestChannel != nil && (highestChannel == nil || newPriority > highestPrio) {
		lowestChannel.DownPrioritize()
		return true
	}

	return false
}

/*
func (m *Manager) PreemptForPriority(currentChannel *channel.Channel) bool {
	max := server.Config.MaxConnections
	if max < 1 {
		return true // unlimited, always allow
	}

	var all []*channel.Channel

	// Collect all channels into a slice
	m.Channels.Range(func(_, value any) bool {
		ch := value.(*channel.Channel)
		all = append(all, ch)
		return true
	})

	// Sort by: priority (desc), then name (asc)
	sort.Slice(all, func(i, j int) bool {
		if all[i].Config.Priority != all[j].Config.Priority {
			return all[i].Config.Priority > all[j].Config.Priority
		}
		return all[i].Name < all[j].Name
	})

	// Count currently online channels
	var onlineCount int
	for _, ch := range all {
		if ch.IsOnline {
			onlineCount++
		}
	}

	// If there's room, allow start
	if onlineCount < max {
		return true
	}

	// Select the top N channels that deserve to be online
	deserved := all[:max]

	// Check if the current channel is among the top N
	for _, ch := range deserved {
		if ch == currentChannel {
			// Preempt a lower-priority online channel (if any)
			for _, ch := range all[max:] {
				if ch.IsOnline {
					ch.DownPrioritize()
					break
				}
			}
			return true
		}
	}

	return false
}

*/
/* Not used */
func (m *Manager) UpdateAllChannels() {
	m.Channels.Range(func(key, value any) bool {
		ch := value.(*channel.Channel)
		if !ch.IsOnline {
			ch.Update()
		}
		return false
	})

}

/* Not used */
func (m *Manager) QueueDownPrioritizedChannels(username string) {
	m.Channels.Range(func(key, value any) bool {
		ch := value.(*channel.Channel)
		if ch.IsOnline && ch.IsDownPrioritized {
			ch.DownPrioritize()
		}
		return false
	})

}

func (m *Manager) GetChannelByUsername(username string) *entity.ChannelInfo {
	thing, ok := m.Channels.Load(username)
	if !ok {
		return nil
	}
	ch := thing.(*channel.Channel)
	return ch.ExportInfo() // assuming ExportInfo returns *entity.ChannelInfo
}

func (m *Manager) GetChannelRaw(username string) *channel.Channel {
	thing, ok := m.Channels.Load(username)
	if !ok {
		return nil
	}
	return thing.(*channel.Channel)
}

func (m *Manager) DownloadChannelImage(username string, force ...bool) error {
	url := fmt.Sprintf("https://thumb.live.mmcdn.com/riw/%s.jpg?%d", username, time.Now().Unix())
	filepath := fmt.Sprintf("./conf/channel-images/%s.jpg", username)

	// Only skip download if force is not set  false
	if len(force) == 0 || !force[0] {
		if _, err := os.Stat(filepath); err == nil {
			// File exists, no need to download
			return nil
		}
	}

	if err := os.MkdirAll("./conf/channel-images", 0777); err != nil {
		return fmt.Errorf("mkdir all images: %w", err)
	}
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("HTTP GET error: %v\n", err)
		return err
	}
	defer resp.Body.Close()

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}
