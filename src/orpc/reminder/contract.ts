import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
export const reminderSchema = z.object({
  taskId: z.string(),
  projectId: z.string(),
  projectKey: z.string(),
  taskCode: z.string(),
  taskTitle: z.string(),
  remindAt: z.date(),
  note: z.string().nullable(),
});

export type Reminder = z.infer<typeof reminderSchema>;

// Structure only. The note's limit and that the time hasn't passed are checked by the service.
const setReminderInputSchema = z.strictObject({
  projectId: z.string(),
  taskId: z.string(),
  remindAt: z.date(),
  note: z.string().optional(),
});

const clearReminderInputSchema = z.strictObject({ projectId: z.string(), taskId: z.string() });

/*===== Procedures =====*/
// A reminder is a personal setting, so a viewer may set one too. `projectAccessErrors` carries NOT_FOUND, which also
// answers a task the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...projectAccessErrors };

export const reminderContract = {
  /** The viewer's waiting reminders, soonest first. Only ever their own. */
  mine: oc.errors({ ...commonErrors, ...authErrors }).output(z.array(reminderSchema)),
  /** Sets the viewer's reminder on a live card, replacing the one they had there. */
  set: oc.errors(errors).input(setReminderInputSchema).output(z.void()),
  /** Removes the viewer's reminder from a card; having none changes nothing. */
  clear: oc.errors(errors).input(clearReminderInputSchema).output(z.void()),
};
