import { oc } from "@orpc/contract";
import { z } from "zod";

import { ACTIVITY_ACTIONS } from "#/orpc/activity/constants";
import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
const fieldsSchema = z.record(z.string(), z.unknown());

/**
 * One history entry as the history pages print it. `before`, `after` and `snapshot` are what the change recorded
 * (see each `recordActivity` call); people in them are ids, which the page names from the project's members.
 */
export const activityItemSchema = z.object({
  id: z.string(),
  action: z.enum(ACTIVITY_ACTIONS),
  /** Who made the change: a timer they stopped can be someone else's (`after.userId`). */
  actorId: z.string(),
  actorName: z.string(),
  actorAvatarUrl: z.string().nullable(),
  /** Null for project-level changes (members, columns, labels). */
  taskId: z.string().nullable(),
  /** The task's code and title when the change was made (`snapshot.code`, `snapshot.title`). */
  taskCode: z.string().nullable(),
  taskTitle: z.string().nullable(),
  before: fieldsSchema.nullable(),
  after: fieldsSchema.nullable(),
  snapshot: fieldsSchema,
  createdAt: z.date(),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

/** A page of a project's history. `nextCursor` is the `before` for the next (older) page; null on the last. */
export const activityPageSchema = z.object({
  items: z.array(activityItemSchema),
  nextCursor: z.date().nullable(),
});

export type ActivityPage = z.infer<typeof activityPageSchema>;

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors, ...projectAccessErrors };

export const activityContract = {
  /** A task's history, newest first (the latest 200). A task the project doesn't have has none. */
  forTask: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.array(activityItemSchema)),
  /** A project's history, newest first, a page at a time: the entries made before `before`. */
  forProject: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), before: z.date().optional() }))
    .output(activityPageSchema),
};
