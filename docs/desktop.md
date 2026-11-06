# Desktop Widget

A small Windows app for the team. It sits at the bottom right of the desktop and shows what a person needs without
opening the site: their tasks for today, notifications and reminders. How to build and ship it is in
[deployment.md](./deployment.md#desktop-widget).

## What It Does

- Three channels, one list at a time: Today, Notifications, Reminders. Each key prints its count and lights an LED.
- **Today** means the viewer's overdue tasks, tasks due today and tasks in Doing, on the team's clock.
- Mark a notification as read, put off a reminder that rang, and open a card in the default browser.
- Never edits a card. Anything more than the actions above happens on the site.
- A due-date alert about a task already under Today stays out of Notifications, since it says the same thing twice. It
  still rings when it arrives, and the bell on the site keeps it.

A viewer can't be assigned tasks, so they have no Today key. They can set reminders, so they keep the other two.

## How It Behaves

Collapsed, the window is a strip of the three keys, 320×56. A key opens its channel at 380×560, growing upward. The
collapse key folds it again. Clicking the tray icon or a toast brings it forward.

When something new arrives, the app raises a Windows toast, opens on the channel that shows it, and holds the window
above the others for 10 seconds, so a click elsewhere can't hide it before it is read. It never takes focus: whoever is
typing keeps typing. After that it is an ordinary window again, and the next click elsewhere sends it behind. It is not
always on top. More than three arrivals at once ring as one toast.

Closing the window hides it; only Quit in the tray ends the app. The tray also holds start with Windows, the language
and sign out. The theme follows Windows.

## How It Works

The app is a thin Wails 3 shell around the `/widget` page on the live server.

- **The page** (`src/routes/widget/`) is an ordinary route with no header or sidebar. No frontend is bundled in the app,
  so sign-in, languages and the checks in the procedures stay as they are, on the same origin, with no CORS or cookie
  changes. Every deploy updates it and nobody reinstalls.
- **The data** comes from the existing procedures (`task.mine`, notifications, reminders), kept fresh by `live.events`.
  The stream goes straight to our server and keeps running while the window is hidden, so the widget doesn't depend on
  web push. The stream only says "something new", so the page compares `notification.list` with the last one.
- **The shell** (`tools/desktop/`) owns what a page can't do: the window and its position, the tray icon, start at
  login, a single instance, toasts and updates. Its settings, log and WebView2 profile are in `%LOCALAPPDATA%\Tofang`;
  the session cookie lives in that profile. Its tray menu and offline page are the only text outside Paraglide
  (`words.go`).
- **The session**: server code reads the session in-process, which can't renew the browser's cookie, so the page asks
  Better-Auth's own endpoint on load and once a day. Otherwise a window left open would be signed out after a week.

## The Bridge

`chrome.webview.postMessage` carries the page's requests to `RawMessageHandler`, and `ExecJS` carries a `tofang:shell`
event back. The messages are in `src/routes/widget/bridge.ts`, and `tools/desktop/bridge/` checks every one.

Wails doesn't support a page on another origin calling `/wails/runtime`, and the page doesn't load it. Two things follow:
nothing ever says the runtime is ready, so the shell calls `HandleMessage("wails:runtime:ready")` after each navigation
or `ExecJS` would wait forever; and `WebviewWindow` bindings aren't available, so everything goes through these messages.

The bridge is the desktop's attack surface: an XSS bug on the site can reach it, so it only does harmless things. It
refuses a message unless both the sending frame and the top page are the server's origin, and `open` only takes URLs on
the server. `SetAlwaysOnTop` leaves out `SWP_NOACTIVATE` and takes focus, so `raise_windows.go` calls `SetWindowPos`
itself. A raise was seen to miss once in five tries, so it checks and tries again.

## Why Wails

Wails uses the WebView2 that Windows already has, and the repo already has Go. Tauri would add Rust. GPUI would add Rust
too and draws its own UI, so everything would be built twice, and Persian text is unproven there. Wails is pinned to an
exact version: it ships weekly. GHSA-2p5f-2gx8-mh8m is only partly fixed in v3.0.0: it concerns frames, and the page has
none, but check the release notes before moving the pin.

## Limits

- Windows first. On Linux under Wayland, an app can't choose its own window position.
- The `.exe` is unsigned, so each person clicks through SmartScreen once. Updates don't ask again.
- The window sits on the primary screen.
