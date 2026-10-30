import { oc } from "@orpc/contract";
import { z } from "zod";

import type { RichTextDoc } from "#/lib/rich-text";
import { attachmentSchema } from "#/orpc/attachment/contract";
import { checklistItemSchema } from "#/orpc/checklist/contract";
import { handoffSchema } from "#/orpc/delegation/contract";
import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { personSchema } from "#/orpc/project/contract";
import { COLUMN_KINDS } from "#/orpc/project/constants";
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
  /** What the card's badges count: its comments (deleted ones left out), its checklist's steps and its attachments. */
  counts: z.object({
    comments: z.number().int(),
    attachments: z.number().int(),
    checklistDone: z.number().int(),
    checklistTotal: z.number().int(),
  }),
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
  /** Its checklist, in order. */
  checklist: z.array(checklistItemSchema),
  /** Its files and links, oldest first. */
  attachments: z.array(attachmentSchema),
});

export type TaskDetail = z.infer<typeof taskDetailSchema>;

/** A project's live tasks, its labels, and everyone the cards name (members, and people who have left it). */
export const boardSchema = z.object({
  tasks: z.array(taskCardSchema),
  labels: z.array(labelSchema),
  people: z.array(personSchema),
});

export type Board = z.infer<typeof boardSchema>;

/** A card in the project's archive, with when it was archived. */
export const archivedTaskSchema = taskCardSchema.extend({ archivedAt: z.date() });

export type ArchivedTask = z.infer<typeof archivedTaskSchema>;

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

/** An open task assigned to the viewer, as "My Tasks" lists it: what it is, where it sits, and its time. */
export const myTaskSchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  projectName: z.string(),
  number: z.number().int(),
  title: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  /** ISO date (`2026-11-04`). */
  dueDate: z.string().nullable(),
  columnKind: z.enum(COLUMN_KINDS),
  /** Null until an admin renames the column: the page prints the kind's own name. */
  columnName: z.string().nullable(),
  spentSeconds: z.number().int(),
  runningSince: z.array(z.date()),
});

export type MyTask = z.infer<typeof myTaskSchema>;

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task or label the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };

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
  /** The project's archived tasks, most recently archived first (docs/app.md → Archive & restore). */
  archived: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string() }))
    .output(z.object({ tasks: z.array(archivedTaskSchema), people: z.array(personSchema) })),
  /** Puts an archived task back on the board, at the bottom of its column. Admins only: anyone else gets `FORBIDDEN`. */
  restore: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.void()),
  /** Deletes an archived task for good. Admins only (rule 10): anyone else gets `FORBIDDEN`, a live task `INVALID_INPUT`. */
  delete: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.void()),
  /**
   * The open tasks assigned to the viewer across the projects they are on, grouped by project (by name), the ones in
   * doing first, then by due date.
   */
  mine: oc.errors({ ...commonErrors, ...authErrors }).output(z.array(myTaskSchema)),
  createLabel: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), name: z.string(), color: z.enum(LABEL_COLORS) }))
    .output(labelSchema),
};
