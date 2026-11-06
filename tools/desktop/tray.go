package main

import (
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// setupTray adds the tray icon: a click brings the window forward, and the menu holds what the window has no room for.
func (s *shell) setupTray() {
	s.tray = s.app.SystemTray.New()
	s.tray.SetIcon(icon)
	s.tray.SetTooltip("Tofang")
	s.tray.OnClick(s.show)
	s.buildTrayMenu()
}

// buildTrayMenu builds the menu in the current language, so switching language builds it again.
func (s *shell) buildTrayMenu() {
	w := dictionary[s.settings.Locale]
	menu := s.app.NewMenu()
	menu.Add(w.open).OnClick(func(*application.Context) { s.show() })
	menu.AddSeparator()

	startAtLogin, err := s.app.Autostart.IsEnabled()
	if err != nil {
		log.Println("autostart:", err)
	}
	item := menu.AddCheckbox(w.startAtLogin, startAtLogin)
	item.OnClick(func(ctx *application.Context) {
		var err error
		if ctx.IsChecked() {
			err = s.app.Autostart.Enable()
		} else {
			err = s.app.Autostart.Disable()
		}
		if err != nil {
			log.Println("autostart:", err)
		}
	})
	menu.Add(w.language).OnClick(func(*application.Context) { s.switchLanguage() })
	menu.AddSeparator()
	menu.Add(w.signOut).OnClick(func(*application.Context) { s.tellPage("sign-out") })
	menu.Add(w.quit).OnClick(func(*application.Context) { s.quit() })
	s.tray.SetMenu(menu)
}

func (s *shell) switchLanguage() {
	s.settings.Locale = map[string]string{"fa": "en", "en": "fa"}[s.settings.Locale]
	s.settings.save(s.dir)
	s.buildTrayMenu()
	s.win.SetURL(s.widgetURL())
}
