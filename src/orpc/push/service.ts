import { AsyncLocalStorage } from "node:async_hooks";

import type { Database } from "#/db/client.server";
import { notificationDetail, notificationSentence } from "#/lib/notification-text";
import { toNotification } from "#/orpc/notification/service";
import {
  claimUnpushed,
  deleteSubscription,
  deleteSubscriptionsById,
  findSubscriptions,
  upsertSubscription,
} from "#/orpc/push/repository";
import {
  baseLocale,
  getServerAsyncLocalStorage,
  isLocale,
  overwriteServerAsyncLocalStorage,
  type Locale,
} from "#/paraglide/runtime";

/*===== Types =====*/
/** A browser's subscription, as the push service needs it. */
export type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } };

/**
 * Sends one encrypted message to one browser (web-push in the app, a fake in tests). A failure throws; one carrying
 * the push service's `statusCode` 404 or 410 means the subscription is gone.
 */
export type PushSender = (target: PushTarget, payload: string) => Promise<void>;

/** What a push notification shows; the service worker (`public/sw.js`) reads it. */
export type PushPayload = { title: string; body: string; url: string; tag: string; lang: Locale; dir: "rtl" | "ltr" };

/** Notifications older than this are never pushed: they would arrive as news long after the fact. */
export const PUSH_WINDOW_MS = 10 * 60_000;

/*===== Subscriptions =====*/
export async function subscribePush({
  db,
  userId,
  endpoint,
  keys,
  locale,
}: PushTarget & { db: Database; userId: string; locale: Locale }): Promise<void> {
  await upsertSubscription({ db, values: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, locale } });
}

export async function unsubscribePush({ db, userId, endpoint }: { db: Database; userId: string; endpoint: string }) {
  await deleteSubscription({ db, userId, endpoint });
}

/*===== Payload =====*/
/** Runs `fn` with `locale` as the current one, so messages and dates read in it outside any request. */
function inLocale<T>(locale: Locale, fn: () => T): T {
  let storage = getServerAsyncLocalStorage();
  if (!storage) {
    // Before the first request (or in a test) Paraglide has made none yet; its middleware reuses this one.
    storage = new AsyncLocalStorage();
    overwriteServerAsyncLocalStorage(storage);
  }
  return storage.run({ locale }, fn) as T;
}

/** A notification as a push message, in `locale`: the bell's sentence, the task's title, and its card's address. */
export function pushPayload({
  row,
  locale,
}: {
  row: Parameters<typeof toNotification>[0];
  locale: Locale;
}): PushPayload {
  const item = toNotification(row);
  const { title, detail } = inLocale(locale, () => ({
    title: notificationSentence(item),
    detail: notificationDetail(item),
  }));
  // The base locale's paths have no prefix (`/projects/…`), the others theirs (`/en/projects/…`).
  const prefix = locale === baseLocale ? "" : `/${locale}`;
  const search = new URLSearchParams({ task: item.taskCode });
  return {
    title,
    body: detail ? `${item.taskTitle}\n${detail}` : item.taskTitle,
    url: `${prefix}/projects/${encodeURIComponent(item.projectKey)}?${search}`,
    tag: item.id,
    lang: locale,
    dir: locale === "fa" ? "rtl" : "ltr",
  };
}

/*===== Deliver =====*/
const isGone = (error: unknown) => {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 404 || status === 410;
};

/**
 * Pushes a person's new notifications to each browser they subscribed (docs/task-manager-plan.md → slice 19). Each
 * notification is claimed first (`claimUnpushed`), so it is pushed at most once however many processes try. A
 * subscription the push service says is gone is removed; any other failure is returned for the caller to log, and
 * that notification is not tried again.
 */
export async function deliverPush({
  db,
  userId,
  send,
  now = Date.now(),
}: {
  db: Database;
  userId: string;
  send: PushSender;
  now?: number;
}): Promise<{ sent: number; removed: number; failures: unknown[] }> {
  const rows = await claimUnpushed({ db, userId, since: new Date(now - PUSH_WINDOW_MS) });
  if (rows.length === 0) return { sent: 0, removed: 0, failures: [] };
  const subscriptions = await findSubscriptions({ db, userId });

  let sent = 0;
  const gone: string[] = [];
  const failures: unknown[] = [];
  for (const subscription of subscriptions) {
    const locale = isLocale(subscription.locale) ? subscription.locale : baseLocale;
    const target = { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } };
    for (const row of rows) {
      try {
        await send(target, JSON.stringify(pushPayload({ row, locale })));
        sent += 1;
      } catch (error) {
        if (isGone(error)) {
          gone.push(subscription.id);
          break;
        }
        failures.push(error);
      }
    }
  }
  await deleteSubscriptionsById({ db, ids: gone });
  return { sent, removed: gone.length, failures };
}
