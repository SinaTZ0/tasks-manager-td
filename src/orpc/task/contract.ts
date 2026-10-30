import { oc } from "@orpc/contract";
import { z } from "zod";

import type { RichTextDoc } from "#/lib/rich-text";
import { handoffSchema } from "#/orpc/delegation/contract";
import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { personSchema } from "#/orpc/project/contract";
import { LABEL_COLORS, TASK_PRIORITIES, TASK_STATUS_ACTIONS } from "#/orpc/task/constants";

/*===== Schemas =====*/
export const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(LABEL_COLORS),
});

export type Label = z.infer<typeof labelSchema>;

/** A stored Tiptap document. The server checks its structure (`parseRichText`) before storing it. */
const richTextSchema = z.custom<RichTextDoc>((value) => typeof value === "object" && value !== null);

/** What a card on the board shows. */
export const taskCardSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  columnId: z.string(),
  position: z.string(),
  title: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  /** ISO date (`2026-11-04`). */
  dueDate: z.string().nullable(),
  estimateMinutes: z.number().int().nullable(),
  ownerId: z.string(),
  assigneeId: z.string().nullable(),
  labelIds: z.array(z.string()),
  hasDescription: z.boolean(),
  /** When it entered the done column; null anywhere else. */
  completedAt: z.date().nullable(),
  /** The time its finished logs add up to. */
  spentSeconds: z.number().int(),
  /** When each of its running timers started (one per person working on it); the card adds them to the total live. */
  runningSince: z.array(z.date()),
  /** The live tasks it waits for (done ones too): it is blocked while any of them is not done or cancelled. */
  waitsFor: z.array(z.string()),
});

export type TaskCard = z.infer<typeof taskCardSchema>;

/** Everything the card's drawer shows. */
export const taskDetailSchema = taskCardSchema.extend({
  description: richTextSchema.nullable(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().nullable(),
  /** Why it is paused or stopped, while it is: the reason given, by whom and when. */
  statusNote: z
    .object({
      action: z.enum(["pause", "stop"]),
      reason: z.string().nullable(),
      actorId: z.string(),
      at: z.date(),
    })
    .nullable(),
  /** Its hand-offs, oldest first: the chain from one assignee to the next (Sina → Ali → Reza). */
  handoffs: z.array(handoffSchema),
});

export type TaskDetail = z.infer<typeof taskDetailSchema>;

/** A project's live tasks, its labels, and everyone the cards name (members, and people who have left it). */
export const boardSchema = z.object({
  tasks: z.array(taskCardSchema),
  labels: z.array(labelSchema),
  people: z.array(personSchema),
});

export type Board = z.infer<typeof boardSchema>;

// Structure only. Trimming, limits, and whether a person, column or label belongs to the project, are the service's.
const taskFieldsSchema = z.strictObject({
  title: z.string(),
  description: z.unknown().nullable(),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().nullable(),
  estimateMinutes: z.number().int().nullable(),
  ownerId: z.string(),
  assigneeId: z.string().nullable(),
  labelIds: z.array(z.string()),
});

const createTaskInputSchema = taskFieldsSchema
  .omit({ ownerId: true })
  .partial()
  .extend({ projectId: z.string(), title: z.string(), columnId: z.string().optional() });

const updateTaskInputSchema = taskFieldsSchema.partial().extend({ projectId: z.string(), taskId: z.string() });

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task or label the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...projectAccessErrors };

/**
 * A move into doing or done refused because the task still waits for others (rule 4). The board asks for a comment and
 * sends the move again with `forceComment`.
 */
const blockedErrors = {
  ...errors,
  BLOCKED: { message: "Blocked.", data: z.object({ blockerIds: z.array(z.string()) }) },
};

/** Why a blocked task is moved into doing or done anyway; written as a comment on it. */
const forceCommentSchema = z.string().optional();

export const taskContract = {
  board: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string() }))
    .output(boardSchema),
  get: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), number: z.number().int() }))
    .output(taskDetailSchema),
  create: oc.errors(errors).input(createTaskInputSchema).output(taskCardSchema),
  update: oc.errors(errors).input(updateTaskInputSchema).output(taskDetailSchema),
  move: oc
    .errors(blockedErrors)
    .input(
      z.strictObject({
        projectId: z.string(),
        taskId: z.string(),
        columnId: z.string(),
        /** The key the board computed between the card's new neighbours (`src/lib/position.ts`). */
        position: z.string(),
        forceComment: forceCommentSchema,
      }),
    )
    .output(taskCardSchema),
  /** Start (or resume), pause, finish, stop or reopen: moves the task to that action's column (`STATUS_ACTION_RULES`). */
  transition: oc
    .errors(blockedErrors)
    .input(
      z.strictObject({
        projectId: z.string(),
        taskId: z.string(),
        action: z.enum(TASK_STATUS_ACTIONS),
        /** Required to stop, optional to pause, ignored otherwise. */
        reason: z.string().optional(),
        forceComment: forceCommentSchema,
      }),
    )
    .output(taskCardSchema),
  archive: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.void()),
  createLabel: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), name: z.string(), color: z.enum(LABEL_COLORS) }))
    .output(labelSchema),
};
