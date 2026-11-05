import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { notification, pushSubscription, user } from "#/db/schema";
import type { NotificationRow } from "#/orpc/notification/repository";

/*===== Types =====*/
export type PushSubscriptionRecord = typeof pushSubscription.$inferSelect;

/*===== Subscriptions =====*/
/** Stores a browser's subscription for a person; the same endpoint again replaces its keys, language and person. */
export async function upsertSubscription({
  db,
  values,
}: {
  db: Database;
  values: Pick<PushSubscriptionRecord, "userId" | "endpoint" | "p256dh" | "auth" | "locale">;
}): Promise<void> {
  await db
    .insert(pushSubscription)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId: values.userId, p256dh: values.p256dh, auth: values.auth, locale: values.locale },
    });
}

/** Removes a person's subscription by its endpoint; someone else's stays. */
export async function deleteSubscription({ db, userId, endpoint }: { db: Database; userId: string; endpoint: string }) {
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

/** Removes subscriptions the push service says are gone. */
export async function deleteSubscriptionsById({ db, ids }: { db: Database; ids: string[] }) {
  if (ids.length === 0) return;
  await db.delete(pushSubscription).where(inArray(pushSubscription.id, ids));
}

export function findSubscriptions({ db, userId }: { db: Database; userId: string }): Promise<PushSubscriptionRecord[]> {
  return db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
}

/*===== Notifications =====*/
/**
 * Claims a person's notifications not pushed yet, made since `since`: marks them pushed and returns them, with who
 * caused each. The update locks each row, so when several app processes hear the same signal only one of them gets it.
 */
export async function claimUnpushed({
  db,
  userId,
  since,
}: {
  db: Database;
  userId: string;
  since: Date;
}): Promise<NotificationRow[]> {
  const claimed = await db
    .update(notification)
    .set({ pushedAt: sql`now()` })
    .where(and(eq(notification.userId, userId), isNull(notification.pushedAt), gt(notification.createdAt, since)))
    .returning();
  if (claimed.length === 0) return [];
  const actorIds = [...new Set(claimed.flatMap((row) => (row.actorId ? [row.actorId] : [])))];
  const names = new Map(
    actorIds.length === 0
      ? []
      : (await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, actorIds))).map(
          (row) => [row.id, row.name] as const,
        ),
  );
  return claimed
    .map((row) => ({ ...row, actorName: row.actorId ? (names.get(row.actorId) ?? null) : null }))
    .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** The people with notifications not pushed yet since `since`: who to deliver to after missed signals. */
export async function findUnpushedUserIds({ db, since }: { db: Database; since: Date }): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: notification.userId })
    .from(notification)
    .where(and(isNull(notification.pushedAt), gt(notification.createdAt, since)));
  return rows.map((row) => row.userId);
}
