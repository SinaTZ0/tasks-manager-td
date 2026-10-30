import { z } from "zod";

import type { Database } from "#/db/client.server";
import { publishLive } from "#/orpc/live/publish";
import { oneOf } from "#/orpc/allowed-values";
import { NOTIFICATION_KINDS, NOTIFICATION_LIST_LIMIT, type NotificationKind } from "#/orpc/notification/constants";
import type { Notification } from "#/orpc/notification/contract";
import { addDays, teamToday } from "#/lib/team-day";
import {
  countUnread,
  findDueTasksFor,
  findNotifications,
  insertDueReminders,
  insertNotifications,
  markRead,
} from "#/orpc/notification/repository";
import { taskCode } from "#/orpc/task/constants";

/*===== Types =====*/
/** What a notification keeps to read well later, since titles change and tasks can be deleted. */
type NotificationData = { projectKey: string; taskCode: string; taskTitle: string; note?: string | null };

/** One person to tell about one event. */
export type NotificationEntry = {
  userId: string;
  kind: NotificationKind;
  projectId: string;
  taskId: string;
  data: NotificationData;
};

/*===== Notify =====*/
/**
 * Tells people about something the actor did, inside the transaction that does it. Nobody is told about their own
 * doing: assigning yourself a task is no news to you.
 */
export async function notify({
  db,
  actorId,
  entries,
}: {
  db: Database;
  actorId: string;
  entries: NotificationEntry[];
}): Promise<void> {
  const told = entries.filter((entry) => entry.userId !== actorId);
  await insertNotifications({ db, values: told.map((entry) => ({ ...entry, actorId, data: entry.data })) });
  // The bell hears about it at once while its page holds the live stream open (slice 16).
  await publishLive({ db, signals: told.map((entry) => ({ kind: "notification" as const, id: entry.userId })) });
}

/*===== Due Dates =====*/
/**
 * Reminds a person of the tasks they answer for (assigned, or owned with no assignee) that are due today or tomorrow
 * (`due_soon`) or overdue (`overdue`), once each per due date. There is no scheduler: this runs when the person's
 * notifications are read, which the bell does every `NOTIFICATION_POLL_MS`, and the unique index makes a repeat a
 * no-op. Changing a due date allows a new reminder. "Today" is the team's (`src/lib/team-day.ts`).
 */
export async function remindDue({
  db,
  userId,
  now = Date.now(),
}: {
  db: Database;
  userId: string;
  now?: number;
}): Promise<void> {
  const today = teamToday(now);
  const tasks = await findDueTasksFor({ db, userId, until: addDays({ date: today, days: 1 }) });
  await insertDueReminders({
    db,
    values: tasks.map((row) => ({
      userId,
      kind: row.dueDate < today ? "overdue" : "due_soon",
      actorId: null,
      projectId: row.projectId,
      taskId: row.id,
      dueDate: row.dueDate,
      data: {
        projectKey: row.projectKey,
        taskCode: taskCode({ key: row.projectKey, number: row.number }),
        taskTitle: row.title,
      } satisfies NotificationData,
    })),
  });
}

/*===== Read =====*/
/** The person's latest notifications, and how many they haven't read. Only ever their own. */
export async function listNotifications({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}): Promise<{ items: Notification[]; unread: number }> {
  const rows = await findNotifications({ db, userId, limit: NOTIFICATION_LIST_LIMIT });
  const unread = await countUnread({ db, userId });
  return {
    items: rows.map((row) => {
      const data = row.data as Partial<NotificationData>;
      return {
        id: row.id,
        kind: oneOf({ allowed: NOTIFICATION_KINDS, value: row.kind, what: "notification kind" }),
        actorName: row.actorName,
        projectKey: data.projectKey ?? "",
        taskCode: data.taskCode ?? "",
        taskTitle: data.taskTitle ?? "",
        note: data.note ?? null,
        dueDate: row.dueDate,
        read: row.readAt !== null,
        createdAt: row.createdAt,
      };
    }),
    unread,
  };
}

/** Marks the person's notifications read: the ones named, or all. Ids that aren't theirs (or aren't ids) are ignored. */
export async function markNotificationsRead({
  db,
  userId,
  ids,
}: {
  db: Database;
  userId: string;
  ids?: string[] | undefined;
}): Promise<void> {
  const valid = ids?.filter((id) => z.guid().safeParse(id).success);
  if (valid && valid.length === 0) return;
  await markRead({ db, userId, ids: valid });
}
