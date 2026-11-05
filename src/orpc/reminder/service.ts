import { z } from "zod";

import type { Database } from "#/db/client.server";
import { issuesToErrorData } from "#/lib/schema-issues";
import { publishLive } from "#/orpc/live/publish";
import type { WatchedEvent } from "#/orpc/notification/constants";
import { insertNotifications } from "#/orpc/notification/repository";
import type { NotificationData } from "#/orpc/notification/service";
import type { Reminder } from "#/orpc/reminder/contract";
import {
  deleteReminder,
  deleteRemindersById,
  findDueReminders,
  findRemindersOf,
  upsertReminder,
  type DueReminderRow,
} from "#/orpc/reminder/repository";
import { newReminderSchema } from "#/orpc/reminder/validation";
import { taskCode } from "#/orpc/task/constants";
import { lockTask } from "#/orpc/task/repository";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type SetReminderResult =
  { kind: "success" } | { kind: "not-found" } | { kind: "invalid"; fields: Record<string, string> };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Read =====*/
/** The person's waiting reminders, soonest first. */
export async function listReminders({
  db,
  user,
}: {
  db: Database;
  user: { id: string; role?: string | null | undefined };
}): Promise<Reminder[]> {
  const rows = await findRemindersOf({ db, userId: user.id, isAdmin: user.role === "admin" });
  return rows.map((row) => ({
    taskId: row.taskId,
    projectId: row.projectId,
    projectKey: row.projectKey,
    taskCode: taskCode({ key: row.projectKey, number: row.number }),
    taskTitle: row.title,
    remindAt: row.remindAt,
    note: row.note,
  }));
}

/*===== Set =====*/
/**
 * Sets the person's reminder on a card, replacing the one they had there (docs/app.md → Reminders). Private to them,
 * and it doesn't change the card, so it writes no history: the one exception to rule 7. Refused on an archived card;
 * a done or cancelled one is fine ("check this fix in a week").
 *
 * @returns `not-found` for a task the project doesn't have, `invalid` with field messages for a long note or a time
 * that has passed.
 */
export async function setReminder({
  db,
  userId,
  projectId,
  taskId,
  input,
  now = Date.now(),
}: {
  db: Database;
  userId: string;
  projectId: string;
  taskId: string;
  input: unknown;
  now?: number;
}): Promise<SetReminderResult> {
  if (!isUuid(taskId)) return { kind: "not-found" };
  const parsed = newReminderSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { remindAt, note } = parsed.data;
  if (remindAt.getTime() <= now) return { kind: "invalid", fields: { remindAt: m.reminder_error_past() } };

  return db.transaction(async (tx): Promise<SetReminderResult> => {
    const task = await lockTask({ db: tx, projectId, id: taskId });
    if (!task || task.archivedAt) return { kind: "not-found" };
    await upsertReminder({ db: tx, values: { userId, taskId, remindAt, note } });
    return { kind: "success" };
  });
}

/*===== Clear =====*/
/** Removes the person's own reminder from a card. An id that isn't a task's simply has none to remove. */
export async function clearReminder({ db, userId, taskId }: { db: Database; userId: string; taskId: string }) {
  if (isUuid(taskId)) await deleteReminder({ db, userId, taskId });
}

/*===== Fire =====*/
/** What became of the card since the reminder was set, which its sentence says. Null when it is still open. */
function cardState(row: DueReminderRow): WatchedEvent | null {
  if (row.archivedAt) return "archived";
  if (row.columnKind === "done") return "completed";
  if (row.columnKind === "cancelled") return "stopped";
  return null;
}

/** Whether the person may still read the card, since a notification carries its title. */
const canReadCard = (row: DueReminderRow) => row.status === "active" && (row.role === "admin" || row.memberId !== null);

/**
 * Turns the reminders whose time has come into notifications, each once: the job runs this every minute, and one that
 * came due while the server was down fires at the next run. A card that was finished or cancelled meanwhile still
 * reminds, saying so, because a reminder that silently disappears is worse than one nobody needed. It is dropped only
 * for someone who can no longer read the card.
 *
 * @returns How many people were told.
 */
export async function fireReminders({ db, now = Date.now() }: { db: Database; now?: number }): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await findDueReminders({ db: tx, now });
    if (rows.length === 0) return 0;
    const told = rows.filter(canReadCard);

    // Not through `notify`: it skips people told about their own doing, and a reminder is exactly that.
    await insertNotifications({
      db: tx,
      values: told.map((row) => ({
        userId: row.userId,
        kind: "reminder",
        actorId: null,
        projectId: row.projectId,
        taskId: row.taskId,
        data: {
          projectKey: row.projectKey,
          taskCode: taskCode({ key: row.projectKey, number: row.number }),
          taskTitle: row.title,
          note: row.note,
          event: cardState(row) ?? undefined,
        } satisfies NotificationData,
      })),
    });
    await deleteRemindersById({ db: tx, ids: rows.map((row) => row.id) });
    await publishLive({ db: tx, signals: told.map((row) => ({ kind: "notification" as const, id: row.userId })) });
    return told.length;
  });
}
