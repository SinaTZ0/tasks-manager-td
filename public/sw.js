// Tofang's service worker (docs/task-manager-plan.md → slice 19): shows the push notifications the server sends
// (`src/orpc/push/`), and opens the card when one is clicked. Nothing is cached: the app works as it does without it.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* A push: `{ title, body, url, tag, lang, dir }`. Skipped while a Tofang window has the focus: its bell already lit. */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : null;
  if (!data) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.focused)) return;
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        lang: data.lang,
        dir: data.dir,
        icon: "/apple-touch-icon.png",
        data: { url: data.url },
      });
    })(),
  );
});

/* A click: the card in a Tofang window already open, or in a new one. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        // Only a window this worker controls can be sent elsewhere; any other opens the card beside it.
        if (open.navigate) {
          const moved = await open.navigate(url).catch(() => null);
          if (moved) return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
