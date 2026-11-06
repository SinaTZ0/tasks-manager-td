package main

import (
	"encoding/json"
	"io"
	"log"
	"os"
	"path/filepath"
)

const maxLogBytes = 1 << 20

// dataDir is where the app keeps its settings, log and WebView2 profile: %LOCALAPPDATA%\Tofang on Windows. The session
// cookie lives in that profile, which is why a person stays signed in across restarts.
func dataDir() string {
	base, err := os.UserCacheDir()
	if err != nil {
		base = os.TempDir()
	}
	dir := filepath.Join(base, "Tofang")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

// setupLog writes to a file beside the settings, starting over once it grows past maxLogBytes.
func setupLog(dir string) {
	path := filepath.Join(dir, "tofang.log")
	if info, err := os.Stat(path); err == nil && info.Size() > maxLogBytes {
		_ = os.Remove(path)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		log.SetOutput(io.Discard)
		return
	}
	log.SetOutput(file)
}

type settings struct {
	Locale string `json:"locale"`
}

func loadSettings(dir string) settings {
	s := settings{Locale: "fa"}
	raw, err := os.ReadFile(filepath.Join(dir, "settings.json"))
	if err == nil {
		_ = json.Unmarshal(raw, &s)
	}
	if s.Locale != "en" {
		s.Locale = "fa"
	}
	return s
}

func (s settings) save(dir string) {
	raw, _ := json.Marshal(s)
	if err := os.WriteFile(filepath.Join(dir, "settings.json"), raw, 0o644); err != nil {
		log.Println("settings:", err)
	}
}
