import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { NOTIFICATION_KINDS, WATCHED_EVENTS } from "#/orpc/notification/constants";
import { COLUMN_KINDS } from "#/orpc/project/constants";

/*===== Schemas =====*/
export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  /** Null for a due-date reminder, which nobody caused. */
  actorName: z.string().nullable(),
  projectKey: z.string(),
  /** The task's code and title as they were when it happened. */
  taskCode: z.string(),
  taskTitle: z.string(),
  /** For a watched card, what happened to it. */
  event: z.enum(WATCHED_EVENTS).nullable(),
  /** For a watched card moved to another kind of column, that column's kind; `note` has its name, if it has one. */
  columnKind: z.enum(COLUMN_KINDS).nullable(),
  /**
   * A delegation's note, the code of the blocker that was finished, a mention's or comment's excerpt, a pause's or
   * stop's reason, the column a watched card was moved to, or who it was handed to.
   */
  note: z.string().nullable(),
  /** For a due-date reminder, the due date (ISO) it was about. */
  dueDate: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors };

export const notificationContract = {
  /** The viewer's latest notifications and how many they haven't read. */
  list: oc.errors(errors).output(z.object({ items: z.array(notificationSchema), unread: z.number().int() })),
  /** Marks the viewer's notifications read: the ones named, or all of them. */
  markRead: oc
    .errors(errors)
    .input(z.strictObject({ ids: z.array(z.string()).max(100).optional() }))
    .output(z.void()),
};
