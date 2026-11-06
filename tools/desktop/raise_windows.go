//go:build windows

package main

import (
	"log"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	hwndTopmost   = ^uintptr(0)     // HWND_TOPMOST (-1)
	hwndNoTopmost = ^uintptr(0) - 1 // HWND_NOTOPMOST (-2)

	swpNoSize     = 0x0001
	swpNoMove     = 0x0002
	swpNoActivate = 0x0010

	gaRoot = 2
)

var (
	user32          = syscall.NewLazyDLL("user32.dll")
	setWindowPos    = user32.NewProc("SetWindowPos")
	windowFromPoint = user32.NewProc("WindowFromPoint")
	getAncestor     = user32.NewProc("GetAncestor")
)

// setTopmost moves the window in or out of the always-on-top band without activating it, so whoever is typing elsewhere
// keeps their focus. Wails' SetAlwaysOnTop leaves out SWP_NOACTIVATE and takes focus.
func setTopmost(w *application.WebviewWindow, on bool) {
	after := hwndNoTopmost
	if on {
		after = hwndTopmost
	}
	setWindowPos.Call(uintptr(w.NativeWindow()), after, 0, 0, 0, 0, swpNoSize|swpNoMove|swpNoActivate)
}

// isOnTop asks Windows which window is at the middle of ours.
func isOnTop(w *application.WebviewWindow) bool {
	x, y := w.Position()
	width, height := w.Size()
	point := uintptr(uint32(x+width/2)) | uintptr(uint32(y+height/2))<<32
	at, _, _ := windowFromPoint.Call(point)
	root, _, _ := getAncestor.Call(at, gaRoot)
	return root == uintptr(w.NativeWindow())
}

// holdOnTop puts the window above the others for `hold`: a click elsewhere can't hide it in that time, so what arrived
// can be read. A raise was seen to miss once in five tries, so it is checked and tried again.
func (s *shell) holdOnTop(hold time.Duration) {
	s.topMu.Lock()
	defer s.topMu.Unlock()
	if s.topTimer != nil {
		s.topTimer.Stop()
	}

	application.InvokeSync(func() { setTopmost(s.win, true) })
	time.AfterFunc(300*time.Millisecond, func() {
		application.InvokeSync(func() {
			if !isOnTop(s.win) {
				log.Println("raise missed, trying again")
				setTopmost(s.win, true)
			}
		})
	})
	s.topTimer = time.AfterFunc(hold, func() {
		application.InvokeSync(func() { setTopmost(s.win, false) })
	})
}
