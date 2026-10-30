import { z } from "zod";

import type { Database } from "#/db/client.server";
import { oneOf } from "#/orpc/allowed-values";
import { NOTIFICATION_KINDS, NOTIFICATION_LIST_LIMIT, type NotificationKind } from "#/orpc/notification/constants";
import type { Notification } from "#/orpc/notification/contract";
import { countUnread, findNotifications, insertNotifications, markRead } from "#/orpc/notification/repository";

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
  await insertNotifications({
    db,
    values: entries
      .filter((entry) => entry.userId !== actorId)
      .map((entry) => ({ ...entry, actorId, data: entry.data })),
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
