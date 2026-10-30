import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { TASK_PRIORITIES } from "#/orpc/task/constants";

/*===== Schemas =====*/
/** One hand-off, by name: a person who leaves the project stays in the chain. */
export const handoffSchema = z.object({
  id: z.string(),
  fromName: z.string(),
  toName: z.string(),
  note: z.string().nullable(),
  at: z.date(),
});

export type Handoff = z.infer<typeof handoffSchema>;

/** A task the viewer handed on (or owns and someone handed on), as the "delegated by me" page lists it. */
export const delegatedTaskSchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  projectName: z.string(),
  number: z.number().int(),
  title: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().nullable(),
  columnKind: z.enum(COLUMN_KINDS),
  /** Null until an admin renames the column: the page prints the kind's own name. */
  columnName: z.string().nullable(),
  assigneeName: z.string().nullable(),
  /** Whether the viewer owns it (else they handed it on without owning it). */
  owned: z.boolean(),
  /** The latest hand-off. */
  last: handoffSchema,
});

export type DelegatedTask = z.infer<typeof delegatedTaskSchema>;

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };

export const delegationContract = {
  /**
   * "You do this now": makes `toId` the assignee and keeps the hand-off. Refused (`INVALID_INPUT` on `toId`) for
   * someone who isn't an active member or already has it; on `note` for one too long.
   */
  delegate: oc
    .errors(errors)
    .input(
      z.strictObject({
        projectId: z.string(),
        taskId: z.string(),
        toId: z.string(),
        note: z.string().optional(),
      }),
    )
    .output(z.void()),
  /** The live tasks the viewer handed on or owns and someone handed on, now with someone else, latest first. */
  mine: oc.errors({ ...commonErrors, ...authErrors }).output(z.array(delegatedTaskSchema)),
};
