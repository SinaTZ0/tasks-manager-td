// Package bridge checks what the /widget page asks of the shell. It holds the shell's one trust decision, so it stays
// free of Wails and can be tested on any machine.
package bridge

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"unicode/utf8"
)

const (
	maxMessageBytes = 8 << 10
	maxTitleRunes   = 200
	maxBodyRunes    = 400
)

// Message is one request from the page. Keep in step with src/routes/widget/bridge.ts.
type Message struct {
	Type  string `json:"type"`
	Mode  string `json:"mode"`
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
}

// The message types, as the page sends them.
const (
	Ready   = "ready"
	Size    = "size"
	Toast   = "toast"
	Raise   = "raise"
	Open    = "open"
	Restart = "restart"
)

// Parse decodes a message and refuses anything that didn't come from the server's own top-level page. WebView2 reports
// the sending frame and the top page as full URLs, so a frame from elsewhere is caught even inside our own page. An
// `open` must also stay on the server: the shell hands it to the default browser, and a script that got into the page
// must not be able to launch whatever it likes.
func Parse(raw, frame, top string, server *url.URL) (Message, error) {
	if !sameOrigin(frame, server) || !sameOrigin(top, server) {
		return Message{}, fmt.Errorf("message from %q in %q", frame, top)
	}
	if len(raw) > maxMessageBytes {
		return Message{}, errors.New("message too long")
	}

	var m Message
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return Message{}, fmt.Errorf("message isn't JSON: %w", err)
	}

	switch m.Type {
	case Ready, Raise, Restart:
	case Size:
		if m.Mode != "strip" && m.Mode != "open" {
			return Message{}, fmt.Errorf("unknown size %q", m.Mode)
		}
	case Toast:
		if m.Title == "" {
			return Message{}, errors.New("toast without a title")
		}
		m.Title = cut(m.Title, maxTitleRunes)
		m.Body = cut(m.Body, maxBodyRunes)
	case Open:
		if !sameOrigin(m.URL, server) {
			return Message{}, fmt.Errorf("won't open %q", m.URL)
		}
	default:
		return Message{}, fmt.Errorf("unknown message %q", m.Type)
	}
	return m, nil
}

func sameOrigin(raw string, server *url.URL) bool {
	u, err := url.Parse(raw)
	return err == nil && u.Scheme == server.Scheme && u.Host == server.Host && u.User == nil
}

func cut(text string, limit int) string {
	if utf8.RuneCountInString(text) <= limit {
		return text
	}
	return string([]rune(text)[:limit])
}
