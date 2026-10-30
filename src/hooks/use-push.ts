import { useCallback, useEffect, useState } from "react";

import { client } from "#/orpc/client";
import { getLocale } from "#/paraglide/runtime";

/*===== Push Subscription =====*/
// "Notify me on this computer" (docs/task-manager-plan.md → slice 19): this browser's push subscription, kept by the
// server for the signed-in person. The subscription itself is the setting: there is nothing else to store.

export type PushState = "unsupported" | "blocked" | "off" | "on";

const SERVICE_WORKER = "/sw.js";

/** Web Push needs a service worker, the Push API and notifications; a page over plain http (not localhost) has none. */
const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const keyBytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) =>
  !!a && a.byteLength === b.byteLength && new Uint8Array(a).every((byte, index) => byte === b[index]);

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Tells the server about the subscription, in the page's language. */
async function save(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  await client.push.subscribe({
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    locale: getLocale(),
  });
}

/** A subscription made with the server's current key, and saved for the signed-in person. */
async function subscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER);
  await navigator.serviceWorker.ready;
  const key = keyBytes((await client.push.config()).publicKey);
  let subscription = await registration.pushManager.getSubscription();
  // A key that changed (the server's secret was rotated) makes the old subscription useless.
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await save(subscription);
}

/** The browser's setting as it stands, with its subscription if it has one. */
async function readState(): Promise<{ state: PushState; subscription: PushSubscription | null }> {
  if (!supported()) return { state: "unsupported", subscription: null };
  if (Notification.permission === "denied") return { state: "blocked", subscription: null };
  const subscription = await currentSubscription();
  return { state: subscription && Notification.permission === "granted" ? "on" : "off", subscription };
}

/**
 * Ends this browser's subscription and tells the server, before signing out: the next person on this browser must not
 * get the last one's notifications. Never throws: signing out goes on regardless.
 */
export async function forgetPushSubscription(): Promise<void> {
  if (!supported()) return;
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await client.push.unsubscribe({ endpoint: subscription.endpoint }).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // The browser's push service is unreachable: the server drops the subscription the first time it fails.
  }
}

/**
 * This browser's push setting, and keys to change it. `null` until read (and on the server). A subscription found on
 * load is saved again, so the server has the page's current language and person, and one made with an old key is
 * replaced.
 */
export function usePush(): {
  state: PushState | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [state, setState] = useState<PushState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readState()
      .then(async ({ state: read, subscription }) => {
        if (cancelled) return;
        setState(read);
        if (read === "on" && subscription) await subscribe();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
    await subscribe();
    setState("on");
  }, []);

  const disable = useCallback(async () => {
    await forgetPushSubscription();
    setState("off");
  }, []);

  return { state, enable, disable };
}
