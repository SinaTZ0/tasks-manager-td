import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { NOTIFICATION_KINDS } from "#/orpc/notification/constants";

/*===== Schemas =====*/
export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  actorName: z.string(),
  projectKey: z.string(),
  /** The task's code and title as they were when it happened. */
  taskCode: z.string(),
  taskTitle: z.string(),
  /** A delegation's note, or the code of the blocker that was finished. */
  note: z.string().nullable(),
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
