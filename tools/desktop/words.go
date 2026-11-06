package main

// The only words the shell prints itself: its tray menu, and the page it shows when the server can't be reached. The
// rest of the app's text is Paraglide messages on the server, which can't reach these two.
type words struct {
	open, startAtLogin, language, signOut, quit, offline string
}

var dictionary = map[string]words{
	"fa": {
		open:         "باز کردن",
		startAtLogin: "اجرا هنگام ورود به ویندوز",
		language:     "English",
		signOut:      "خروج از حساب",
		quit:         "بستن برنامه",
		offline:      "اتصال به سرور برقرار نشد. دوباره تلاش می‌کنیم…",
	},
	"en": {
		open:         "Open",
		startAtLogin: "Start with Windows",
		language:     "فارسی",
		signOut:      "Sign out",
		quit:         "Quit",
		offline:      "Can't reach the server. Trying again…",
	},
}
