package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/teacat/chaturbate-dvr/config"
	"github.com/teacat/chaturbate-dvr/entity"
	"github.com/teacat/chaturbate-dvr/manager"
	"github.com/teacat/chaturbate-dvr/router"
	"github.com/teacat/chaturbate-dvr/server"
	"github.com/urfave/cli/v2"
)

const logo = `
 ██████╗██╗  ██╗ █████╗ ████████╗██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
██║     ███████║███████║   ██║   ██║   ██║██████╔╝██████╔╝███████║   ██║   █████╗
██║     ██╔══██║██╔══██║   ██║   ██║   ██║██╔══██╗██╔══██╗██╔══██║   ██║   ██╔══╝
╚██████╗██║  ██║██║  ██║   ██║   ╚██████╔╝██║  ██║██████╔╝██║  ██║   ██║   ███████╗
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
██████╗ ██╗   ██╗██████╗
██╔══██╗██║   ██║██╔══██╗
██║  ██║██║   ██║██████╔╝
██║  ██║╚██╗ ██╔╝██╔══██╗
██████╔╝ ╚████╔╝ ██║  ██║
╚═════╝   ╚═══╝  ╚═╝  ╚═╝`

// ConfigFile represents the structure of the configuration file
type ConfigFile struct {
	AdminUsername   string `json:"admin_username" yaml:"admin_username"`
	AdminPassword   string `json:"admin_password" yaml:"admin_password"`
	Framerate       int    `json:"framerate" yaml:"framerate"`
	Resolution      int    `json:"resolution" yaml:"resolution"`
	Pattern         string `json:"pattern" yaml:"pattern"`
	OutputDir       string `json:"output_dir" yaml:"output_dir"`
	MaxDuration     int    `json:"max_duration" yaml:"max_duration"`
	MaxFilesize     int    `json:"max_filesize" yaml:"max_filesize"`
	MinFilesize     int    `json:"min_filesize" yaml:"min_filesize"`
	Priority        int    `json:"priority" yaml:"priority"`
	MaxConnections  int    `json:"max_connections" yaml:"max_connections"`
	PersistSettings bool   `json:"persist_settings" yaml:"persist_settings"`
	Port            string `json:"port" yaml:"port"`
	Interval        int    `json:"interval" yaml:"interval"`
	Cookies         string `json:"cookies" yaml:"cookies"`
	UserAgent       string `json:"user_agent" yaml:"user_agent"`
	Domain          string `json:"domain" yaml:"domain"`
}

// loadConfigFile loads configuration from a JSON or YAML file
func loadAppConfig(filename string) (*ConfigFile, error) {
	// If no filename provided, try to find config files automatically
	if filename == "" {

		// Try common config file locations
		possibleFiles := []string{
			"config.json",
			"./conf/persisted-settings.json",
		}

		for _, file := range possibleFiles {
			if _, err := os.Stat(file); err == nil {
				filename = file
				fmt.Printf("📄 Using pre-defined config file: %s\n", filename)
				break
			}
		}

		if filename == "" {
			return nil, nil // No config defined, and no pre-defined file found
		}
	}

	// Check if specified file exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file '%s' does not exist", filename)
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg ConfigFile
	ext := filepath.Ext(filename)

	switch ext {

	case ".json":
		if err := json.Unmarshal(data, &cfg); err != nil {
			return nil, fmt.Errorf("failed to parse JSON config: %w", err)
		}

	default:
		return nil, fmt.Errorf("unsupported config file format: %s (only .json is supported in this build)", ext)
	}

	return &cfg, nil
}

// mergeConfig merges CLI context with config file, CLI takes precedence
func mergeConfig(c *cli.Context, cfg *ConfigFile) {
	if cfg == nil {
		return
	}

	// Only use config file values if CLI values are default/empty
	/*
		if !c.IsSet("username") && cfg.Username != "" {
			c.Set("username", cfg.Username)
		}
	*/
	if !c.IsSet("admin-username") && cfg.AdminUsername != "" {
		c.Set("admin-username", cfg.AdminUsername)
	}
	if !c.IsSet("admin-password") && cfg.AdminPassword != "" {
		c.Set("admin-password", cfg.AdminPassword)
	}
	if !c.IsSet("framerate") && cfg.Framerate != 0 {
		c.Set("framerate", fmt.Sprintf("%d", cfg.Framerate))
	}
	if !c.IsSet("resolution") && cfg.Resolution != 0 {
		c.Set("resolution", fmt.Sprintf("%d", cfg.Resolution))
	}
	if !c.IsSet("pattern") && cfg.Pattern != "" {
		c.Set("pattern", cfg.Pattern)
	}
	if !c.IsSet("output-dir") && cfg.OutputDir != "" {
		c.Set("output-dir", cfg.OutputDir)
	}
	if !c.IsSet("max-duration") && cfg.MaxDuration != 0 {
		c.Set("max-duration", fmt.Sprintf("%d", cfg.MaxDuration))
	}
	if !c.IsSet("max-filesize") && cfg.MaxFilesize != 0 {
		c.Set("max-filesize", fmt.Sprintf("%d", cfg.MaxFilesize))
	}
	if !c.IsSet("min-filesize") && cfg.MinFilesize != 0 {
		c.Set("min-filesize", fmt.Sprintf("%d", cfg.MinFilesize))
	}
	if !c.IsSet("priority") && cfg.Priority != 0 {
		c.Set("priority", fmt.Sprintf("%d", cfg.Priority))
	}
	if !c.IsSet("max-connections") && cfg.MaxConnections != 0 {
		c.Set("max-connections", fmt.Sprintf("%d", cfg.MaxConnections))
	}
	if !c.IsSet("persist-settings") && cfg.PersistSettings {
		c.Set("persist-settings", "true")
	}
	if !c.IsSet("port") && cfg.Port != "" {
		c.Set("port", cfg.Port)
	}
	if !c.IsSet("interval") && cfg.Interval != 0 {
		c.Set("interval", fmt.Sprintf("%d", cfg.Interval))
	}
	if !c.IsSet("cookies") && cfg.Cookies != "" {
		c.Set("cookies", cfg.Cookies)
	}
	if !c.IsSet("user-agent") && cfg.UserAgent != "" {
		c.Set("user-agent", cfg.UserAgent)
	}
	if !c.IsSet("domain") && cfg.Domain != "" {
		c.Set("domain", cfg.Domain)
	}
}

func main() {
	app := &cli.App{
		Name:    "chaturbate-dvr",
		Version: "2.0.2",
		Usage:   "Record your favorite Chaturbate streams automatically. 😎🫵",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "config",
				Aliases: []string{"c"},
				Usage:   "Path to configuration file (JSON or YAML)",
				Value:   "",
			},
			&cli.StringFlag{
				Name:    "username",
				Aliases: []string{"u"},
				Usage:   "The username of the channel to record",
				Value:   "",
			},
			&cli.StringFlag{
				Name:  "admin-username",
				Usage: "Username for web authentication (optional)",
				Value: "",
			},
			&cli.StringFlag{
				Name:  "admin-password",
				Usage: "Password for web authentication (optional)",
				Value: "",
			},
			&cli.IntFlag{
				Name:  "framerate",
				Usage: "Desired framerate (FPS)",
				Value: 30,
			},
			&cli.IntFlag{
				Name:  "resolution",
				Usage: "Desired resolution (e.g., 1080 for 1080p)",
				Value: 1080,
			},
			&cli.StringFlag{
				Name:  "pattern",
				Usage: "Template for naming recorded videos",
				Value: "videos/{{.Username}}_{{.Year}}-{{.Month}}-{{.Day}}_{{.Hour}}-{{.Minute}}-{{.Second}}{{if .Sequence}}_{{.Sequence}}{{end}}",
			},
			&cli.IntFlag{
				Name:  "max-duration",
				Usage: "Split video into segments every N minutes ('0' to disable)",
				Value: 0,
			},
			&cli.IntFlag{
				Name:  "max-filesize",
				Usage: "Split video into segments every N MB ('0' to disable)",
				Value: 0,
			},
			&cli.IntFlag{
				Name:  "min-filesize",
				Usage: "Delete files that are smaller than N MB ('0' to disable)",
				Value: 0,
			},
			&cli.IntFlag{
				Name:  "priority",
				Usage: "video priority (0-xxx, higher is better)",
				Value: 0,
			},
			&cli.IntFlag{
				Name:  "max-connections",
				Usage: "Limit the amount of active connections to the channel (0 for unlimited)",
				Value: 0,
			},
			&cli.BoolFlag{
				Name:  "persist-settings",
				Usage: "Persist settings to config file (default: false)",
				Value: false,
			},
			&cli.StringFlag{
				Name:    "port",
				Aliases: []string{"p"},
				Usage:   "Port for the web interface and API",
				Value:   "8080",
			},
			&cli.IntFlag{
				Name:  "interval",
				Usage: "Check if the channel is online every N minutes",
				Value: 1,
			},
			&cli.StringFlag{
				Name:  "cookies",
				Usage: "Cookies to use in the request (format: key=value; key2=value2)",
				Value: "",
			},
			&cli.StringFlag{
				Name:  "user-agent",
				Usage: "Custom User-Agent for the request",
				Value: "",
			},
			&cli.StringFlag{
				Name:  "domain",
				Usage: "Chaturbate domain to use",
				Value: "https://chaturbate.global/",
			},
			&cli.StringFlag{
				Name:  "output-dir",
				Usage: "Folder where completed recordings will be moved",
				Value: "", // default fallback
			},
		},
		Action: start,
	}
	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func start(c *cli.Context) error {
	fmt.Println(logo)
	var err error
	// Load config file if specified
	cfg, err := loadAppConfig(c.String("config"))

	if err != nil {
		return fmt.Errorf("load config file: %w", err)
	} else {

	}

	// Merge config file with CLI arguments ( CLI takes precedence )
	mergeConfig(c, cfg)
	server.Config, err = config.New(c)
	if err != nil {
		_ = fmt.Errorf("new config: %w", err)
	}
	server.Manager, err = manager.New()
	if err != nil {
		return fmt.Errorf("new manager: %w", err)
	}

	fmt.Printf("--> Loaded config: %s\n", c.String("config"))
	fmt.Printf("--> server.Config.Username: %s\n", server.Config.Username)
	// init web interface if username is not provided
	if server.Config.Username == "" {
		fmt.Printf("👋 Visit http://localhost:%s to use the Web UI\n\n\n", c.String("port"))

		if err := server.Manager.LoadConfig(); err != nil {
			return fmt.Errorf("load config: %w", err)
		}

		return router.SetupRouter().Run(":" + c.String("port"))
	}

	// else create a channel with the provided username
	if err := server.Manager.CreateChannel(&entity.ChannelConfig{
		IsPaused:    false,
		Username:    c.String("username"),
		Framerate:   c.Int("framerate"),
		Resolution:  c.Int("resolution"),
		Pattern:     c.String("pattern"),
		MaxDuration: c.Int("max-duration"),
		MaxFilesize: c.Int("max-filesize"),
		//MinFilesize: c.Int("min-filesize"),
		Priority: c.Int("priority"),
	}, false); err != nil {
		return fmt.Errorf("create channel: %w", err)
	}

	// block forever
	select {}
}
