import { and, count, desc, eq, inArray, isNull, lte, notInArray, or } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { boardColumn, notification, project, projectMember, task, user } from "#/db/schema";

/*===== Types =====*/
type NewNotificationRecord = typeof notification.$inferInsert;
export type NotificationRow = typeof notification.$inferSelect & { actorName: string | null };

/** A task someone answers for whose due date has come close, or passed. */
export type DueTaskRow = {
  id: string;
  projectId: string;
  projectKey: string;
  number: number;
  title: string;
  dueDate: string;
};

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

/**
 * Inserts due-date reminders, skipping any already sent: `notification_due_once_idx` (person, task, kind, due date)
 * turns a repeat into a no-op, so two polls at once still remind once.
 */
export async function insertDueReminders({
  db,
  values,
}: {
  db: Database;
  values: NewNotificationRecord[];
}): Promise<void> {
  if (values.length === 0) return;
  await db.insert(notification).values(values).onConflictDoNothing();
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
      dueDate: notification.dueDate,
      data: notification.data,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actorName: user.name,
    })
    .from(notification)
    .leftJoin(user, eq(user.id, notification.actorId))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

/**
 * The open tasks a person answers for, due on or before `until`: the ones assigned to them, and the unassigned ones
 * they own. Live, not in a done or cancelled column, and only in projects they are still on.
 */
export function findDueTasksFor({
  db,
  userId,
  until,
}: {
  db: Database;
  userId: string;
  until: string;
}): Promise<DueTaskRow[]> {
  return db
    .select({
      id: task.id,
      projectId: task.projectId,
      projectKey: project.key,
      number: task.number,
      title: task.title,
      dueDate: task.dueDate,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .innerJoin(projectMember, and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, userId)))
    .where(
      and(
        isNull(task.archivedAt),
        lte(task.dueDate, until),
        notInArray(boardColumn.kind, ["done", "cancelled"]),
        or(eq(task.assigneeId, userId), and(isNull(task.assigneeId), eq(task.ownerId, userId))),
      ),
    ) as Promise<DueTaskRow[]>;
}

export async function countUnread({ db, userId }: { db: Database; userId: string }): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return row?.value ?? 0;
}
