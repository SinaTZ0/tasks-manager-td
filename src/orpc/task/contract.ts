import { oc } from "@orpc/contract";
import { z } from "zod";

import type { RichTextDoc } from "#/lib/rich-text";
import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { personSchema } from "#/orpc/project/contract";
import { LABEL_COLORS, TASK_PRIORITIES } from "#/orpc/task/constants";

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
});

export type TaskCard = z.infer<typeof taskCardSchema>;

/** Everything the card's drawer shows. */
export const taskDetailSchema = taskCardSchema.extend({
  description: richTextSchema.nullable(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().nullable(),
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
  archive: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.void()),
  createLabel: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), name: z.string(), color: z.enum(LABEL_COLORS) }))
    .output(labelSchema),
};
