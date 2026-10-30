import { sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";

/*===== Channel =====*/
/** The Postgres channel every app process listens on (`listener.server.ts`). */
export const LIVE_CHANNEL = "tofang_live";

/** What goes over the channel: which project changed, or who has a new notification. Kept small (NOTIFY's 8 KB). */
export type LiveSignal = { kind: "project"; id: string } | { kind: "notification"; id: string };

/*===== Publish =====*/
/**
 * Tells every app process about changes, through `pg_notify`. Call it with the transaction that makes the change:
 * Postgres delivers the signal only when that commits, and never for a rollback, so a page is never told about a change
 * it can't read yet. Repeats within one transaction are delivered once.
 */
export async function publishLive({ db, signals }: { db: Database; signals: LiveSignal[] }): Promise<void> {
  const unique = [...new Set(signals.map((signal) => JSON.stringify(signal)))];
  for (const payload of unique) {
    await db.execute(sql`select pg_notify(${LIVE_CHANNEL}, ${payload})`);
  }
}
