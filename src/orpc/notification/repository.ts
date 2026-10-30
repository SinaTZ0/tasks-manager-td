import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { notification, user } from "#/db/schema";

/*===== Types =====*/
type NewNotificationRecord = typeof notification.$inferInsert;
export type NotificationRow = typeof notification.$inferSelect & { actorName: string };

/*===== Writes =====*/
export async function insertNotifications({
  db,
  values,
}: {
  db: Database;
  values: NewNotificationRecord[];
}): Promise<void> {
  if (values.length === 0) return;
  await db.insert(notification).values(values);
}

/** Marks a person's notifications read: the ones named, or all of them. Someone else's ids change nothing. */
export async function markRead({ db, userId, ids }: { db: Database; userId: string; ids?: string[] }): Promise<void> {
  const owned = and(eq(notification.userId, userId), isNull(notification.readAt));
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(ids ? and(owned, inArray(notification.id, ids)) : owned);
}

/*===== Reads =====*/
/** A person's latest notifications, newest first, with who caused each. */
export function findNotifications({
  db,
  userId,
  limit,
}: {
  db: Database;
  userId: string;
  limit: number;
}): Promise<NotificationRow[]> {
  return db
    .select({
      id: notification.id,
      userId: notification.userId,
      kind: notification.kind,
      actorId: notification.actorId,
      projectId: notification.projectId,
      taskId: notification.taskId,
      data: notification.data,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actorName: user.name,
    })
    .from(notification)
    .innerJoin(user, eq(user.id, notification.actorId))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function countUnread({ db, userId }: { db: Database; userId: string }): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return row?.value ?? 0;
}
