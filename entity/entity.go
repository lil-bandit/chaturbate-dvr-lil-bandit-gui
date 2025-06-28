package entity

import (
	"regexp"
	"strings"
)

// Event represents the type of event for the channel.
type Event = string

const (
	EventUpdate Event = "update"
	EventLog    Event = "log"
)

// ChannelConfig represents the configuration for a channel.
type ChannelConfig struct {
	IsPaused    bool   `json:"is_paused"`
	Username    string `json:"username"`
	Framerate   int    `json:"framerate"`
	Resolution  int    `json:"resolution"`
	Pattern     string `json:"pattern"`
	MaxDuration int    `json:"max_duration"`
	MaxFilesize int    `json:"max_filesize"`
	Priority    int    `json:"priority"`
	CreatedAt   int64  `json:"created_at"`
	//IsBlocked bool  `json:"is_blocked"` <-- It's not a "construction" or persistent property, IsBlocked is moslty for info and template
}

func (c *ChannelConfig) Sanitize() {
	c.Username = regexp.MustCompile(`[^a-zA-Z0-9_-]`).ReplaceAllString(c.Username, "")
	c.Username = strings.TrimSpace(c.Username)
}

// ChannelInfo represents the information about a channel,
// mostly used for the template rendering.
type ChannelInfo struct {
	IsOnline          bool
	IsPaused          bool
	IsDownPrioritized bool
	IsBlocked         bool
	Username          string
	Duration          string
	Filesize          string
	//DurationInt       int
	FilesizeBytes  string
	Filename       string
	StreamedAt     string
	MaxDuration    string
	MaxFilesize    string
	MaxFilesizeInt int
	MaxDurationInt int
	//MinFilesize       string
	CreatedAt    int64
	Logs         []string
	GlobalConfig *Config // for nested template to access $.Config

	// Add these fields for editing support:
	Framerate  int
	Resolution int
	Pattern    string
	Priority   int
}

// ChannelConfig represents the configuration for a channel.
type AppConfig struct {
	Framerate       int    `json:"framerate"`
	Resolution      int    `json:"resolution"`
	Pattern         string `json:"pattern"`
	MaxDuration     int    `json:"max_duration"`
	MaxFilesize     int    `json:"max_filesize"`
	MinFilesize     int    `json:"min_filesize"`
	MaxConnections  int    `json:"max_connections"`
	PersistSettings bool   `json:"persist_settings"`
	OutputDir       string `json:"output_dir"`
	Port            string `json:"port"`
	Interval        int    `json:"interval"`
	Cookies         string `json:"cookies"`
	UserAgent       string `json:"user_agent"`
	Domain          string `json:"domain"`
}

// Config holds the configuration for the application.
type Config struct {
	Version         string
	AppInitTs          int64
	WebInitTs       int64
	Username        string
	AdminUsername   string
	AdminPassword   string
	Framerate       int
	Resolution      int
	Pattern         string
	MaxDuration     int
	MaxFilesize     int
	MinFilesize     int
	MaxConnections  int
	PersistSettings bool
	Priority        int
	OutputDir       string
	Port            string
	Interval        int
	Cookies         string
	UserAgent       string
	Domain          string
}
