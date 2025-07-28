package channel

import (
	"bytes"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/teacat/chaturbate-dvr/server"
)

// Pattern holds the date/time and sequence information for the filename pattern
type Pattern struct {
	Username string
	Year     string
	Month    string
	Day      string
	Hour     string
	Minute   string
	Second   string
	Sequence int
}

// NextFile prepares the next file to be created, by cleaning up the last file and generating a new one
func (ch *Channel) NextFile() error {
	if err := ch.Cleanup(); err != nil {
		return err
	}
	filename, err := ch.GenerateFilename()
	if err != nil {
		return err
	}
	if err := ch.CreateNewFile(filename); err != nil {
		return err
	}

	// Increment the sequence number for the next file
	ch.Sequence++
	return nil
}

/*
// Cleanup cleans the file and resets it, called when the stream errors out or before next file was created.
func (ch *Channel) Cleanup() error {
	if ch.File == nil {
		return nil
	}
	defer func() {
		ch.Filesize = 0
		ch.Duration = 0
	}() // Always nil ch.File at the end

	// Sync the file to ensure data is written to disk
	if err := ch.File.Sync(); err != nil {
		return fmt.Errorf("sync file: %w", err)
	}
	if err := ch.File.Close(); err != nil {
		return fmt.Errorf("close file: %w", err)
	}

	filename := ch.File.Name()
	// Check size
	fi, err := os.Stat(filename)
	if err != nil {
		ch.Error("cannot stat file: %v", err)
		return nil
	}
	if fi.Size() <= 1024*1024*int64(server.Config.MinFilesize) {
		if err := os.Remove(filename); err != nil {
			return fmt.Errorf("remove small file: %w", err)
		}
		return nil
	}

	// If we get here, we definitely have a file to move
	if server.Config.OutputDir != "" {
		ch.MoveFinishedFile(filename)
	}

	ch.File = nil
	return nil
}*/

// Cleanup cleans the file and resets it, called when the stream errors out or before next file was created.
func (ch *Channel) Cleanup() error {
	if ch.File == nil {
		return nil
	}

	// Store the filename before we nil out ch.File
	filename := ch.File.Name()

	// Reset file-related fields immediately to prevent double cleanup
	defer func() {
		ch.File = nil
		ch.Filesize = 0
		ch.Duration = 0
	}()

	// Sync the file to ensure data is written to disk
	if err := ch.File.Sync(); err != nil {
		return fmt.Errorf("sync file: %w", err)
	}
	if err := ch.File.Close(); err != nil {
		return fmt.Errorf("close file: %w", err)
	}

	// Check size
	fi, err := os.Stat(filename)
	if err != nil {
		ch.Error("cannot stat file: %v", err)
		return nil
	}
	if fi.Size() <= 1024*1024*int64(server.Config.MinFilesize) {
		if err := os.Remove(filename); err != nil {
			return fmt.Errorf("remove small file: %w", err)
		}
		return nil
	}

	// If we get here, we definitely have a file to move
	if server.Config.OutputDir != "" {
		ch.MoveFinishedFile(filename)
	}

	return nil
}

// GenerateFilename creates a filename based on the configured pattern and the current timestamp
func (ch *Channel) GenerateFilename() (string, error) {
	var buf bytes.Buffer

	// Parse the filename pattern defined in the channel's config
	tpl, err := template.New("filename").Parse(ch.Config.Pattern)
	if err != nil {
		return "", fmt.Errorf("filename pattern error: %w", err)
	}

	// Get the current time based on the Unix timestamp when the stream was started
	t := time.Unix(ch.StreamedAt, 0)
	pattern := &Pattern{
		Username: ch.Config.Username,
		Sequence: ch.Sequence,
		Year:     t.Format("2006"),
		Month:    t.Format("01"),
		Day:      t.Format("02"),
		Hour:     t.Format("15"),
		Minute:   t.Format("04"),
		Second:   t.Format("05"),
	}

	if err := tpl.Execute(&buf, pattern); err != nil {
		return "", fmt.Errorf("template execution error: %w", err)
	}
	return buf.String(), nil
}

// CreateNewFile creates a new file for the channel using the given filename
func (ch *Channel) CreateNewFile(filename string) error {

	// Ensure the directory exists before creating the file
	if err := os.MkdirAll(filepath.Dir(filename), 0777); err != nil {
		return fmt.Errorf("mkdir all: %w", err)
	}

	// Open the file in append mode, create it if it doesn't exist
	file, err := os.OpenFile(filename+".ts", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0777)
	if err != nil {
		return fmt.Errorf("cannot open file: %s: %w", filename, err)
	}

	ch.File = file
	return nil
}

// ShouldSwitchFile determines whether a new file should be created.
func (ch *Channel) ShouldSwitchFile() bool {
	maxFilesizeBytes := ch.Config.MaxFilesize * 1024 * 1024
	maxDurationSeconds := ch.Config.MaxDuration * 60

	return (ch.Duration >= float64(maxDurationSeconds) && ch.Config.MaxDuration > 0) ||
		(ch.Filesize >= maxFilesizeBytes && ch.Config.MaxFilesize > 0)
}

func (ch *Channel) MoveFinishedFile(finishedFileName string) {
	// Normalize path
	finishedFileName = filepath.Clean(finishedFileName)

	// Supports pattern with folder, examples:
	// "videos/qtiepie_2025-06-24_18-29-04.ts"
	// "videos/some_hottie/some_hottie_2025-06-24_18-29-04.ts"
	// "videos/boogie_411/2025/06-24_18-29-04.ts"

	// Extract the first directory as srcRoot
	parts := strings.SplitN(finishedFileName, string(filepath.Separator), 2)
	if len(parts) < 2 {
		ch.Error("unexpected source path: %s", finishedFileName)
		return
	}
	srcRoot := parts[0]
	srcRootWithSep := srcRoot + string(filepath.Separator)
	dstRoot := server.Config.OutputDir

	// Remove the first directory prefix
	relPath := strings.TrimPrefix(finishedFileName, srcRootWithSep)
	destPath := filepath.Join(dstRoot, relPath)

	if err := os.MkdirAll(filepath.Dir(destPath), os.ModePerm); err != nil {
		ch.Error("could not create dest folder: %v", err)
		return
	}

	if err := os.Rename(finishedFileName, destPath); err != nil {
		ch.Error("failed to move file: %v", err)
		return
	}
	ch.Info("moved file to: %s", destPath)

	// Cleanup empty parent directories up to the first directory
	srcDir := filepath.Dir(finishedFileName)
	for srcDir != srcRoot && srcDir != "." && srcDir != string(filepath.Separator) {
		_ = os.Remove(srcDir)
		srcDir = filepath.Dir(srcDir)
	}
}
