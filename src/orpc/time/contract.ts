import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";

/*===== Schemas =====*/
/** One stretch of work by one person on one task. */
export const timeLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startedAt: z.date(),
  /** Null while the timer runs. */
  endedAt: z.date().nullable(),
  /** Typed in, not timed (from before the timer was the only way): its start is noon UTC of the day it names. */
  manual: z.boolean(),
  note: z.string().nullable(),
});

export type TimeLog = z.infer<typeof timeLogSchema>;

/**
 * A stretch the task spent in one column, from its history, with the column's kind and its name then (null for a fixed
 * column's own name). `leftAt` is null for where it is now.
 */
export const columnStaySchema = z.object({
  columnId: z.string(),
  kind: z.enum(COLUMN_KINDS),
  name: z.string().nullable(),
  enteredAt: z.date(),
  leftAt: z.date().nullable(),
});

export type ColumnStay = z.infer<typeof columnStaySchema>;

/** A task's time: every log (people's names come from the board), and where it has been. */
export const taskTimeSchema = z.object({
  logs: z.array(timeLogSchema),
  stays: z.array(columnStaySchema),
});

export type TaskTime = z.infer<typeof taskTimeSchema>;

/** The viewer's running timer, with enough of its task to link to it. */
export const runningTimerSchema = z.object({
  logId: z.string(),
  taskId: z.string(),
  projectKey: z.string(),
  number: z.number().int(),
  title: z.string(),
  startedAt: z.date(),
});

export type RunningTimer = z.infer<typeof runningTimerSchema>;

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors, ...roleErrors };
const projectErrors = { ...errors, ...projectAccessErrors };

export const timeContract = {
  /** The viewer's own running timer, on whichever project. */
  current: oc.errors(errors).output(runningTimerSchema.nullable()),
  /** Stops the viewer's running clock; the task stays where it is. */
  stop: oc.errors(errors).output(z.void()),
  forTask: oc
    .errors(projectErrors)
    .input(z.strictObject({ projectId: z.string(), number: z.number().int() }))
    .output(taskTimeSchema),
};
