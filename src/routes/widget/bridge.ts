/*===== Bridge =====*/
// How the page talks to the desktop shell (`tools/desktop/`, docs/desktop.md). The page is an ordinary page on the
// server, so in a plain browser none of this exists and each call does nothing or falls back to the browser.

/** What the page asks of the shell. Keep in step with `tools/desktop/bridge/`, which checks every one. */
export type ShellMessage =
  /** The page is up: the shell replies with anything it has waiting. */
  | { type: "ready" }
  /** The window's shape. */
  | { type: "size"; mode: "strip" | "open" }
  /** A Windows toast. */
  | { type: "toast"; title: string; body: string }
  /** Holds the window above the others for a moment, so a click elsewhere can't hide it before it is read. */
  | { type: "raise" }
  /** Opens a URL on this site in the default browser. */
  | { type: "open"; url: string }
  /** Applies a downloaded update. */
  | { type: "restart" };

/** What the shell tells the page, as a `tofang:shell` event on `window`. */
export type ShellEvent = { type: "show" } | { type: "sign-out" } | { type: "update-ready" };

type WebviewHost = { chrome?: { webview?: { postMessage: (message: string) => void } } };

const webview = () => (window as unknown as WebviewHost).chrome?.webview;

export function tellShell(message: ShellMessage): void {
  webview()?.postMessage(JSON.stringify(message));
}

/** Opens a path on this site in the default browser: a link would navigate the widget's own window. */
export function openInBrowser(path: string): void {
  const url = new URL(path, window.location.origin).href;
  if (webview()) tellShell({ type: "open", url });
  else window.open(url, "_blank", "noopener");
}
