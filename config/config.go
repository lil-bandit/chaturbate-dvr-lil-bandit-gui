package config

import (
	"time"

	"github.com/teacat/chaturbate-dvr/entity"
	"github.com/urfave/cli/v2"
)

// New initializes a new Config struct with values from the CLI context.
func New(c *cli.Context) (*entity.Config, error) {
	return &entity.Config{
		Version:         c.App.Version,
		AppInitUnixMs:   time.Now().UnixMilli(),
		WebInitUnixMs:   time.Now().UnixMilli(),
		Username:        c.String("username"),
		AdminUsername:   c.String("admin-username"),
		AdminPassword:   c.String("admin-password"),
		Framerate:       c.Int("framerate"),
		Resolution:      c.Int("resolution"),
		Pattern:         c.String("pattern"),
		MaxDuration:     c.Int("max-duration"),
		MaxFilesize:     c.Int("max-filesize"),
		MinFilesize:     c.Int("min-filesize"),
		MaxConnections:  c.Int("max-connections"),
		PersistSettings: c.Bool("persist-settings"),
		OutputDir:       c.String("output-dir"),
		Priority:        c.Int("priority"),
		Port:            c.String("port"),
		Interval:        c.Int("interval"),
		Cookies:         c.String("cookies"),
		UserAgent:       c.String("user-agent"),
		Domain:          c.String("domain"),
	}, nil
}
