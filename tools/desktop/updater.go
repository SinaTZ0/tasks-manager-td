package main

import (
	"context"
	_ "embed"
	"log"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/endpoint"
)

const updateEvery = 6 * time.Hour

// publicKey verifies every update. Its private half never enters this repo (docs/deployment.md → Desktop Widget).
//
//go:embed updater.key.pub
var publicKey []byte

// setupUpdater checks the server for a newer signed build and stages it beside the binary. It runs headless: the
// framework's own window is in English only, so the page shows the key in the person's language and sends `restart`.
// A development build has no version to compare, so it doesn't look.
func (s *shell) setupUpdater() {
	if version == devVersion {
		return
	}
	provider, err := endpoint.New(endpoint.Config{URL: serverURL + "/desktop/{{platform}}/{{arch}}/stable.json"})
	if err != nil {
		log.Println("updater:", err)
		return
	}
	s.app.Event.On(updater.EventUpdateReady, func(*application.CustomEvent) {
		log.Println("update staged")
		s.updateReady.Store(true)
		s.tellPage("update-ready")
	})
	s.app.Event.On(updater.EventError, func(e *application.CustomEvent) {
		log.Printf("updater: %+v", e.Data)
	})
	err = s.app.Updater.Init(updater.Config{
		CurrentVersion: version,
		Providers:      []updater.Provider{provider},
		PublicKey:      publicKey,
		CheckInterval:  updateEvery,
		Window:         updater.WindowNone,
	})
	if err != nil {
		log.Println("updater:", err)
		return
	}
	// The interval's first check comes one interval from now, and the app may not run that long in one go.
	go func() {
		if err := s.app.Updater.CheckAndInstall(context.Background()); err != nil {
			log.Println("updater:", err)
		}
	}()
}

// restart applies a staged update: a helper swaps the binary once this process has gone, then starts it again.
func (s *shell) restart() {
	if !s.updateReady.Load() {
		return
	}
	s.quitting.Store(true)
	if err := s.app.Updater.Restart(context.Background()); err != nil {
		s.quitting.Store(false)
		log.Println("updater:", err)
	}
}
