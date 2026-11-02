import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";

/*===== Schemas =====*/
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

/** A task's time: where it has been. Nobody clocks their work; how long a task took is read from its columns. */
export const taskTimeSchema = z.object({
  stays: z.array(columnStaySchema),
});

export type TaskTime = z.infer<typeof taskTimeSchema>;

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors, ...roleErrors };
const projectErrors = { ...errors, ...projectAccessErrors };

export const timeContract = {
  forTask: oc
    .errors(projectErrors)
    .input(z.strictObject({ projectId: z.string(), number: z.number().int() }))
    .output(taskTimeSchema),
};
