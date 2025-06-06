package entity

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
}

// ChannelInfo represents the information about a channel,
// mostly used for the template rendering.
type ChannelInfo struct {
	IsOnline          bool
	IsPaused          bool
	IsDownPrioritized bool
	Username          string
	Duration          string
	Filesize          string
	Filename          string
	StreamedAt        string
	MaxDuration       string
	MaxFilesize       string
	Priority          int
	CreatedAt         int64
	Logs              []string
	GlobalConfig      *Config // for nested template to access $.Config

	// Add these fields for editing support:
	Framerate  int
	Resolution int
	Pattern    string
}

// ChannelConfig represents the configuration for a channel.
type AppConfig struct {
	Framerate      int    `json:"framerate"`
	Resolution     int    `json:"resolution"`
	Pattern        string `json:"pattern"`
	MaxDuration    int    `json:"max_duration"`
	MaxFilesize    int    `json:"max_filesize"`
	MaxConnections int    `json:"max_connections"`
	Port           string `json:"port"`
	Interval       int    `json:"interval"`
	Cookies        string `json:"cookies"`
	UserAgent      string `json:"user_agent"`
	Domain         string `json:"domain"`
}

// Config holds the configuration for the application.
type Config struct {
	Version        string
	Username       string
	AdminUsername  string
	AdminPassword  string
	Framerate      int
	Resolution     int
	Pattern        string
	MaxDuration    int
	MaxFilesize    int
	MaxConnections int
	Priority       int
	Port           string
	Interval       int
	Cookies        string
	UserAgent      string
	Domain         string
}
