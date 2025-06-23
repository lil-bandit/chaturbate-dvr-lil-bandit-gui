package server

import (
	"net/http"

	"github.com/teacat/chaturbate-dvr/entity"
)

var Manager IManager

type IManager interface {
	CreateChannel(conf *entity.ChannelConfig, shouldSave bool) error
	StopChannel(username string) error
	PauseChannel(username string) error
	ResumeChannel(username string) error
	ChannelInfo() []*entity.ChannelInfo
	Publish(name string, ch *entity.ChannelInfo)
	Subscriber(w http.ResponseWriter, r *http.Request)
	LoadConfig() error
	SaveConfig() error
	SaveServerConfig() error
	DeleteServerConfig() error
	PreemptForPriority(priority int) bool
	DownloadChannelImage(username string, force ...bool) error
	GetChannelByUsername(username string) *entity.ChannelInfo
}
