import webpush from "web-push";

import { db } from "#/db/client.server";
import { createLogger } from "#/lib/logger.server";
import { listenLive } from "#/orpc/live/listener.server";
import { findUnpushedUserIds } from "#/orpc/push/repository";
import { deliverPush, PUSH_WINDOW_MS, type PushSender } from "#/orpc/push/service";
import { vapidKeys } from "#/orpc/push/vapid.server";

const log = createLogger("push");

/*===== Delivery =====*/
// Pushes notifications to browsers once their transaction has committed: the live listener (slice 16) hears each
// person's `notification` signal after the commit, in every app process, and `deliverPush` claims the rows so only one
// process sends them. The listener stays open for this job, with or without pages connected.

/** Signals for one person this close together (one change can tell them twice) are delivered once. */
const COALESCE_MS = 300;
/** How long a push service may hold a message for a browser that is offline, in seconds. */
const TTL_SECONDS = 60 * 60;

// Vite re-evaluates server modules on every change in development; the flag lives on `globalThis` so each edit doesn't
// start another job.
const STARTED = Symbol.for("app.pushDelivery.started");
const state = globalThis as typeof globalThis & { [STARTED]?: boolean };

const send: PushSender = async (target, payload) => {
  const { publicKey, privateKey, subject } = vapidKeys();
  await webpush.sendNotification(target, payload, {
    vapidDetails: { subject, publicKey, privateKey },
    TTL: TTL_SECONDS,
  });
};

async function deliver(userId: string): Promise<void> {
  try {
    const result = await deliverPush({ db, userId, send });
    for (const failure of result.failures) log.warn({ err: failure, userId }, "push not delivered");
    if (result.removed > 0) log.info({ userId, removed: result.removed }, "removed gone push subscriptions");
  } catch (error) {
    log.error({ err: error, userId }, "push delivery failed");
  }
}

/** Delivers to everyone with notifications not pushed yet: at start, and after the listener missed signals. */
async function catchUp(): Promise<void> {
  try {
    const since = new Date(Date.now() - PUSH_WINDOW_MS);
    for (const userId of await findUnpushedUserIds({ db, since })) await deliver(userId);
  } catch (error) {
    log.error({ err: error }, "push catch-up failed");
  }
}

/**
 * Starts pushing notifications to subscribed browsers, inside the app's process (docs/task-manager-plan.md → slice
 * 19). With several processes each hears every signal, but each notification is sent once.
 */
export function startPushDelivery(): void {
  if (state[STARTED]) return;
  state[STARTED] = true;

  const waiting = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue = (userId: string) => {
    waiting.add(userId);
    timer ??= setTimeout(() => {
      timer = undefined;
      const ids = [...waiting];
      waiting.clear();
      void Promise.all(ids.map(deliver));
    }, COALESCE_MS);
  };

  // Never aborted: the job lasts as long as the process.
  listenLive({
    signal: new AbortController().signal,
    onEvent: (event) => {
      if (event.kind === "lost") void catchUp();
      else if (event.signal.kind === "notification") queue(event.signal.id);
    },
  });
  void catchUp();
}
