// Command desktop is the Tofang desktop widget: a small window at the bottom right of the screen that shows the /widget
// page from the server (docs/desktop.md). Everything a person reads is that page; this shell owns what a page can't do:
// the window, the tray, Windows toasts, start at login and updates.
package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"

	"tofang/desktop/bridge"
)

const (
	devVersion = "dev"

	// How long something new stays above the other windows, so a click elsewhere can't hide it before it is read.
	holdNewFor = 10 * time.Second
	// How long a click on the tray or a toast keeps it up: the person asked for it, but it shouldn't stick around.
	holdShownFor = 2 * time.Second

	retryOfflineEvery = 10 * time.Second
)

// Set at build time with -ldflags (build.sh).
var (
	serverURL = "http://localhost:3000"
	version   = devVersion
)

//go:embed assets/icon.png
var icon []byte

type shell struct {
	app      *application.App
	win      *application.WebviewWindow
	tray     *application.SystemTray
	toasts   *notifications.NotificationService
	server   *url.URL
	dir      string
	settings settings

	placeMu  sync.Mutex
	mode     string
	placedOn string

	topMu    sync.Mutex
	topTimer *time.Timer

	toastCount  atomic.Int64
	updateReady atomic.Bool
	quitting    atomic.Bool
}

func main() {
	server, err := url.Parse(serverURL)
	if err != nil {
		panic(err)
	}
	dir := dataDir()
	setupLog(dir)
	log.Printf("start %s, server %s", version, serverURL)

	s := &shell{
		toasts:   notifications.New(),
		server:   server,
		dir:      dir,
		settings: loadSettings(dir),
		mode:     "strip",
	}

	s.app = application.New(application.Options{
		Name:     "Tofang",
		Icon:     icon,
		Services: []application.Service{application.NewService(s.toasts)},
		Windows:  application.WindowsOptions{WebviewUserDataPath: filepath.Join(dir, "webview")},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID:               "tofang.desktop.widget",
			OnSecondInstanceLaunch: func(application.SecondInstanceData) { s.show() },
		},
		RawMessageHandler: func(_ application.Window, raw string, origin *application.OriginInfo) {
			s.hear(raw, origin)
		},
		ErrorHandler: func(err error) { log.Println("app:", err) },
	})

	s.win = s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:                      "Tofang",
		Width:                      stripWidth,
		Height:                     stripHeight,
		Frameless:                  true,
		DisableResize:              true,
		DefaultContextMenuDisabled: true,
		HTML:                       offlinePage(dictionary[s.settings.Locale].offline),
		Windows:                    application.WindowsWindow{HiddenOnTaskbar: true},
	})

	// Closing hides the window: only Quit in the tray ends the app, so its stream and toasts keep going.
	s.win.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if s.quitting.Load() {
			return
		}
		event.Cancel()
		s.win.Hide()
	})

	// A page on the server never loads Wails' runtime, so nothing would ever say it is ready, and ExecJS would wait for
	// that forever. The page needs none of the runtime: only the channel ExecJS uses.
	s.win.OnWindowEvent(events.Windows.WebViewNavigationCompleted, func(*application.WindowEvent) {
		s.win.HandleMessage("wails:runtime:ready")
	})

	s.toasts.OnNotificationResponse(func(result notifications.NotificationResult) {
		if result.Error != nil {
			log.Println("toast:", result.Error)
			return
		}
		s.show()
	})

	s.app.Event.OnApplicationEvent(events.Common.ApplicationStarted, func(*application.ApplicationEvent) {
		s.place()
		s.setupTray()
		s.setupUpdater()
		go s.keepPlaced()
		go s.connect()
	})

	if err := s.app.Run(); err != nil {
		log.Println("run:", err)
	}
}

// widgetURL is the page in the chosen language: the language lives in the URL, and the base locale has no prefix.
func (s *shell) widgetURL() string {
	if s.settings.Locale == "en" {
		return serverURL + "/en/widget"
	}
	return serverURL + "/widget"
}

// connect waits for the server and then loads the page. A failed load would leave WebView2's own error page in the
// window, in English, with no way back, so the local page stays up until the server answers.
func (s *shell) connect() {
	client := http.Client{Timeout: 5 * time.Second}
	for {
		response, err := client.Get(serverURL + "/healthz")
		if err == nil {
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK {
				s.win.SetURL(s.widgetURL())
				return
			}
		}
		log.Println("server not reachable, trying again")
		time.Sleep(retryOfflineEvery)
	}
}

// hear runs one message from the page.
func (s *shell) hear(raw string, origin *application.OriginInfo) {
	message, err := bridge.Parse(raw, origin.Origin, origin.TopOrigin, s.server)
	if err != nil {
		log.Println("refused:", err)
		return
	}

	switch message.Type {
	case bridge.Ready:
		if s.updateReady.Load() {
			s.tellPage("update-ready")
		}
	case bridge.Size:
		s.setMode(message.Mode)
	case bridge.Toast:
		err := s.toasts.SendNotification(notifications.NotificationOptions{
			ID:    fmt.Sprintf("tofang-%d", s.toastCount.Add(1)),
			Title: message.Title,
			Body:  message.Body,
		})
		if err != nil {
			log.Println("toast:", err)
		}
	case bridge.Raise:
		s.win.Show()
		go s.holdOnTop(holdNewFor)
	case bridge.Open:
		if err := s.app.Browser.OpenURL(message.URL); err != nil {
			log.Println("open:", err)
		}
	case bridge.Restart:
		go s.restart()
	}
}

// tellPage sends the page a `tofang:shell` event. The type goes through JSON, so it can't break out of the script.
func (s *shell) tellPage(eventType string) {
	detail, _ := json.Marshal(map[string]string{"type": eventType})
	s.win.ExecJS(fmt.Sprintf(`window.dispatchEvent(new CustomEvent("tofang:shell",{detail:%s}))`, detail))
}

// show brings the window forward, opened.
func (s *shell) show() {
	s.win.Show()
	s.tellPage("show")
	go s.holdOnTop(holdShownFor)
}

func (s *shell) quit() {
	s.quitting.Store(true)
	s.app.Quit()
}

func offlinePage(text string) string {
	return `<!doctype html><meta charset="utf-8"><body dir="auto" style="margin:0;height:100vh;display:flex;` +
		`align-items:center;justify-content:center;background:#1a1a18;color:#d8d6cf;font:13px system-ui">` + text
}
