package main

import (
	"fmt"
	"time"
)

const (
	stripWidth, stripHeight = 320, 56
	openWidth, openHeight   = 380, 560

	edgeGap = 12
	// A taskbar that hides itself leaves the work area at full height, then covers the window's foot when it pops up.
	autoHideTaskbarGap = 60

	replaceEvery = 30 * time.Second
)

// place puts the window at the bottom right of the primary screen's work area, beside the tray. It grows upward, so its foot stays put.
func (s *shell) place() {
	s.placeMu.Lock()
	defer s.placeMu.Unlock()

	width, height := stripWidth, stripHeight
	if s.mode == "open" {
		width, height = openWidth, openHeight
	}

	screen := s.app.Screen.GetPrimary()
	if screen == nil {
		return
	}
	area := screen.WorkArea
	gap := edgeGap
	if area.Height >= screen.Bounds.Height {
		gap = autoHideTaskbarGap
	}

	s.win.SetSize(width, height)
	s.win.SetPosition(area.X+area.Width-width-edgeGap, area.Y+area.Height-height-gap)
	s.placedOn = fmt.Sprint(area, screen.ScaleFactor)
}

func (s *shell) setMode(mode string) {
	s.placeMu.Lock()
	changed := s.mode != mode
	s.mode = mode
	s.placeMu.Unlock()
	if changed {
		s.place()
	}
}

// keepPlaced moves the window back when displays change (a laptop docked, a taskbar moved). Wails has no event for
// this on Windows, so it is checked every so often: the check only reads the screen list.
func (s *shell) keepPlaced() {
	for range time.Tick(replaceEvery) {
		screen := s.app.Screen.GetPrimary()
		if screen != nil && fmt.Sprint(screen.WorkArea, screen.ScaleFactor) != s.placedOn {
			s.place()
		}
	}
}
