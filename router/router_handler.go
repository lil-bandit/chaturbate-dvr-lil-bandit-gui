package router

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/teacat/chaturbate-dvr/entity"
	"github.com/teacat/chaturbate-dvr/manager"
	"github.com/teacat/chaturbate-dvr/server"
)

// IndexData represents the data structure for the index page.
type IndexData struct {
	Config   *entity.Config
	Channels []*entity.ChannelInfo
}

// sortChannels sorts the channels based on custom criteria.
func sortChannels(channels []*entity.ChannelInfo) {
	sort.Slice(channels, func(i, j int) bool {
		rank := func(chInfo *entity.ChannelInfo) int {
			switch {
			case !chInfo.IsPaused && !chInfo.IsDownPrioritized && chInfo.IsOnline:
				return 0 // "ONLINE"
			case !chInfo.IsPaused && chInfo.IsDownPrioritized:
				return 1 // "QUEUED"
			case !chInfo.IsPaused && chInfo.IsBlocked:
				return 2 // "BLOCKED"
			case !chInfo.IsPaused && !chInfo.IsOnline:
				return 3 // "OFFLINE"
			case chInfo.IsPaused:
				return 4 // "PAUSED"
			default:
				return 5 // The rest
			}
		}
		ri, rj := rank(channels[i]), rank(channels[j])
		if ri != rj {
			return ri < rj
		}
		return channels[i].Username < channels[j].Username
	})
}

// Index renders the index page with channel information.
func Index(c *gin.Context) {
	channels := server.Manager.ChannelInfo()

	sortChannels(channels)

	c.HTML(200, "index.html", &IndexData{
		Config:   server.Config,
		Channels: channels,
	})
}

// CreateChannelRequest represents the request body for creating a channel.
type CreateChannelRequest struct {
	Username    string `form:"username" binding:"required"`
	Framerate   int    `form:"framerate" binding:"required"`
	Resolution  int    `form:"resolution" binding:"required"`
	Pattern     string `form:"pattern" binding:"required"`
	MaxDuration int    `form:"max_duration"`
	MaxFilesize int    `form:"max_filesize"`
	MinFilesize int    `form:"min_filesize"`
	Priority    int    `form:"priority"`
	//Edit        bool   `form:"edit"`
}

// CreateChannel creates a new channel.
func CreateChannel(c *gin.Context) {
	var req *CreateChannelRequest
	if err := c.Bind(&req); err != nil {
		c.AbortWithError(http.StatusBadRequest, fmt.Errorf("bind: %w", err))
		return
	}

	edit := c.PostForm("edit") == "true"
	fmt.Printf("---------------->  EDIT from form: %v\n", edit)

	// EDIT MODE
	if edit {

		// Edit mode: update existing channel config
		// Use the real channel object for editing
		mgr, ok := server.Manager.(*manager.Manager) // import "github.com/teacat/chaturbate-dvr/manager"
		if !ok {
			c.String(http.StatusInternalServerError, "Manager type assertion failed")
			return
		}
		ch := mgr.GetChannelRaw(req.Username)
		if ch == nil {
			c.String(http.StatusNotFound, "Channel not found")
			return
		}
		// Now you can update config fields
		ch.Config.Framerate = req.Framerate
		ch.Config.Resolution = req.Resolution
		ch.Config.Pattern = req.Pattern
		ch.Config.MaxDuration = req.MaxDuration
		ch.Config.MaxFilesize = req.MaxFilesize
		ch.Config.Priority = req.Priority

		if err := mgr.SaveConfig(); err != nil {
			c.String(http.StatusInternalServerError, "Failed to save config: %v", err)
			return
		}
		c.Redirect(http.StatusFound, "/")
		return
	}

	// CREATE MODE
	// Create mode: create new channel(s)
	for i, username := range strings.Split(req.Username, ",") {
		server.Manager.CreateChannel(&entity.ChannelConfig{
			IsPaused:    false,
			Username:    username,
			Framerate:   req.Framerate,
			Resolution:  req.Resolution,
			Pattern:     req.Pattern,
			MaxDuration: req.MaxDuration,
			MaxFilesize: req.MaxFilesize,
			Priority:    req.Priority,
			CreatedAt:   time.Now().Unix(),
		}, true, i+1)
	}
	c.Redirect(http.StatusFound, "/")
}

// StopChannel stops a channel.
func StopChannel(c *gin.Context) {
	server.Manager.StopChannel(c.Param("username"))

	c.Redirect(http.StatusFound, "/")
}

// PauseChannel pauses a channel.
func PauseChannel(c *gin.Context) {
	server.Manager.PauseChannel(c.Param("username"))

	c.Redirect(http.StatusFound, "/")
}

// ResumeChannel resumes a paused channel.
func ResumeChannel(c *gin.Context) {
	server.Manager.ResumeChannel(c.Param("username"))

	c.Redirect(http.StatusFound, "/")
}

// Updates handles the SSE connection for updates.
func Updates(c *gin.Context) {
	server.Manager.Subscriber(c.Writer, c.Request)
}

// UpdateConfigRequest represents the request body for updating configuration.
type UpdateConfigRequest struct {
	Cookies            string `form:"cookies"`
	UserAgent          string `form:"user_agent"`
	MaxConnections     int    `form:"max_connections"`
	MinFilesize        int    `form:"min_filesize"`
	PersistSettingsTmp string `form:"persist_settings"`
}

// UpdateConfig updates the server configuration.
func UpdateConfig(c *gin.Context) {
	var req *UpdateConfigRequest

	if err := c.Bind(&req); err != nil {
		c.AbortWithError(http.StatusBadRequest, fmt.Errorf("bind: %w", err))
		return
	}

	//persistSettings := c.Param("persist_settings")

	server.Config.Cookies = req.Cookies
	server.Config.UserAgent = req.UserAgent
	server.Config.MaxConnections = req.MaxConnections
	server.Config.MinFilesize = req.MinFilesize
	server.Config.PersistSettings = (req.PersistSettingsTmp == "on") // Check string to get boolean

	if server.Config.PersistSettings {
		if err := server.Manager.SaveServerConfig(); err != nil {
			_ = fmt.Errorf("save server config: %w", err)
		}
	} else {
		if err := server.Manager.DeleteServerConfig(); err != nil {
			_ = fmt.Errorf("delete server config: %w", err)
		}
	}

	c.Redirect(http.StatusFound, "/")
}

func UpdateThumbnail(c *gin.Context) {

	username := c.Param("username")

	mgr, ok := server.Manager.(*manager.Manager)
	if !ok {
		c.String(http.StatusInternalServerError, "Manager type assertion failed")
		return
	}

	_ = mgr.DownloadChannelImage(username, true)

	chInfo := server.Manager.GetChannelByUsername(username)
	if chInfo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	c.JSON(http.StatusOK, chInfo)
}

func UpdateChannel(c *gin.Context) {
	username := c.Param("username")
	mgr, ok := server.Manager.(*manager.Manager) // import "github.com/teacat/chaturbate-dvr/manager"
	if !ok {
		c.String(http.StatusInternalServerError, "Manager type assertion failed")
		return
	}
	ch := mgr.GetChannelRaw(username)
	chInfo := mgr.GetChannelByUsername(username)
	if ch == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	} else {

		mgr.Publish(entity.EventLog, ch.ExportInfo())
		fmt.Printf("Updating channel: %s\n", username)
	}
	c.JSON(http.StatusOK, chInfo)

}

// GetChannelJSON responds with the JSON representation of a channel's information.
func GetChannelJSON(c *gin.Context) {
	username := c.Param("username")
	chInfo := server.Manager.GetChannelByUsername(username)
	if chInfo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	c.JSON(http.StatusOK, chInfo)
}

// GetAllChannelsJSON responds with the JSON array of all channels' information.
func GetAllChannelsJSON(c *gin.Context) {
	channels := server.Manager.ChannelInfo()
	c.JSON(http.StatusOK, channels)
}
