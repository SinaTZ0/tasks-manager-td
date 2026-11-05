import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { boardColumn, project, projectMember, reminder, task, user } from "#/db/schema";

/*===== Types =====*/
/** A waiting reminder with the card it is about, as its person reads it. */
export type ReminderRow = {
  taskId: string;
  projectId: string;
  projectKey: string;
  number: number;
  title: string;
  remindAt: Date;
  note: string | null;
};

/** A reminder whose time has come, with what firing it needs to know. */
export type DueReminderRow = {
  id: string;
  userId: string;
  taskId: string;
  projectId: string;
  projectKey: string;
  number: number;
  title: string;
  note: string | null;
  archivedAt: Date | null;
  columnKind: string;
  role: string;
  status: string;
  /** Their project membership; null when they are not on the card's project. */
  memberId: string | null;
};

/*===== Writes =====*/
/** Stores a person's reminder on a card; they have one per card, so a new one replaces it. */
export async function upsertReminder({
  db,
  values,
}: {
  db: Database;
  values: { userId: string; taskId: string; remindAt: Date; note: string | null };
}): Promise<void> {
  await db
    .insert(reminder)
    .values(values)
    .onConflictDoUpdate({
      target: [reminder.userId, reminder.taskId],
      set: { remindAt: values.remindAt, note: values.note },
    });
}

/** Removes a person's reminder from a card; someone else's stays. */
export async function deleteReminder({ db, userId, taskId }: { db: Database; userId: string; taskId: string }) {
  await db.delete(reminder).where(and(eq(reminder.userId, userId), eq(reminder.taskId, taskId)));
}

export async function deleteRemindersById({ db, ids }: { db: Database; ids: string[] }) {
  await db.delete(reminder).where(inArray(reminder.id, ids));
}

/*===== Reads =====*/
/**
 * A person's waiting reminders, soonest first, on the cards they can still open: a card moved to a project they aren't
 * on leaves the list.
 */
export function findRemindersOf({
  db,
  userId,
  isAdmin,
}: {
  db: Database;
  userId: string;
  isAdmin: boolean;
}): Promise<ReminderRow[]> {
  return db
    .select({
      taskId: task.id,
      projectId: task.projectId,
      projectKey: project.key,
      number: task.number,
      title: task.title,
      remindAt: reminder.remindAt,
      note: reminder.note,
    })
    .from(reminder)
    .innerJoin(task, eq(task.id, reminder.taskId))
    .innerJoin(project, eq(project.id, task.projectId))
    .leftJoin(projectMember, and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, userId)))
    .where(and(eq(reminder.userId, userId), isAdmin ? undefined : isNotNull(projectMember.userId)))
    .orderBy(asc(reminder.remindAt));
}

/**
 * Locks the reminders whose time has come. Rows another process has locked are skipped, so during a deploy, with two
 * app containers, each reminder fires in one of them; the caller deletes them in the same transaction.
 */
export function findDueReminders({ db, now }: { db: Database; now: number }): Promise<DueReminderRow[]> {
  return db
    .select({
      id: reminder.id,
      userId: reminder.userId,
      taskId: task.id,
      projectId: task.projectId,
      projectKey: project.key,
      number: task.number,
      title: task.title,
      note: reminder.note,
      archivedAt: task.archivedAt,
      columnKind: boardColumn.kind,
      role: user.role,
      status: user.status,
      memberId: projectMember.userId,
    })
    .from(reminder)
    .innerJoin(task, eq(task.id, reminder.taskId))
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .innerJoin(user, eq(user.id, reminder.userId))
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, reminder.userId)),
    )
    .where(lte(reminder.remindAt, new Date(now)))
    .for("update", { of: reminder, skipLocked: true });
}
