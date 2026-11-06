package bridge

import (
	"net/url"
	"strings"
	"testing"
)

var server, _ = url.Parse("https://tofang.example")

const page = "https://tofang.example/widget"

func TestParseRefusesAnythingNotFromOurOwnPage(t *testing.T) {
	cases := []struct{ name, frame, top string }{
		{"another site", "https://evil.example/", "https://evil.example/"},
		{"a frame from elsewhere in our page", "https://evil.example/", page},
		{"our page framed elsewhere", page, "https://evil.example/"},
		{"plain http", "http://tofang.example/widget", "http://tofang.example/widget"},
		{"a lookalike host", "https://tofang.example.evil.example/", "https://tofang.example.evil.example/"},
		{"no origin", "", ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := Parse(`{"type":"raise"}`, c.frame, c.top, server); err == nil {
				t.Fatal("accepted")
			}
		})
	}
}

func TestParseOpensOnlyOurOwnSite(t *testing.T) {
	refused := []string{
		"https://evil.example/projects/TD",
		"file:///C:/Windows/System32/calc.exe",
		"javascript:alert(1)",
		"https://tofang.example@evil.example/",
		"https://user@tofang.example/",
		"",
	}
	for _, target := range refused {
		raw := `{"type":"open","url":"` + target + `"}`
		if _, err := Parse(raw, page, page, server); err == nil {
			t.Errorf("opened %q", target)
		}
	}
	if _, err := Parse(`{"type":"open","url":"https://tofang.example/projects/TD?task=TD-1"}`, page, page, server); err != nil {
		t.Errorf("refused the site's own card: %v", err)
	}
}

func TestParseRefusesUnknownMessages(t *testing.T) {
	for _, raw := range []string{`{"type":"run"}`, `{"type":"size","mode":"huge"}`, `not json`, `{"type":"toast"}`} {
		if _, err := Parse(raw, page, page, server); err == nil {
			t.Errorf("accepted %s", raw)
		}
	}
}

func TestParseCutsLongToastsOnRuneBoundaries(t *testing.T) {
	raw := `{"type":"toast","title":"` + strings.Repeat("ک", 500) + `"}`
	m, err := Parse(raw, page, page, server)
	if err != nil {
		t.Fatal(err)
	}
	if got := len([]rune(m.Title)); got != maxTitleRunes {
		t.Fatalf("title is %d runes", got)
	}
}
