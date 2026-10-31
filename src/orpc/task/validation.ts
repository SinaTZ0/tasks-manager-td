import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import { parseRichText, type RichTextDoc } from "#/lib/rich-text";
import {
  ESTIMATE_MAX_MINUTES,
  LABEL_COLORS,
  LABEL_NAME_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  STATUS_REASON_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_TITLE_MAX_LENGTH,
} from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Fields =====*/
// Domain rules for a task's fields. Whether a person, column or label belongs to the project needs the database, so
// the service checks that after parsing.

const titleSchema = persianText()
  .min(1, { error: () => m.task_error_title_required() })
  .max(TASK_TITLE_MAX_LENGTH, { error: () => m.task_error_title_too_long({ max: TASK_TITLE_MAX_LENGTH }) });

/** A Tiptap document, or nothing. An empty editor stores null; anything the editor couldn't produce is refused. */
const descriptionSchema = z
  .unknown()
  .nullable()
  .transform((value, ctx): { doc: RichTextDoc; text: string } | null => {
    if (value === null || value === undefined) return null;
    const parsed = parseRichText(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: m.task_error_description_invalid() });
      return z.NEVER;
    }
    if (parsed.text.length === 0) return null;
    if (parsed.text.length > TASK_DESCRIPTION_MAX_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: m.task_error_description_too_long({ max: TASK_DESCRIPTION_MAX_LENGTH }),
      });
      return z.NEVER;
    }
    return parsed;
  });

const estimateSchema = z
  .number()
  .int()
  .min(1, { error: () => m.task_error_estimate_invalid() })
  .max(ESTIMATE_MAX_MINUTES, { error: () => m.task_error_estimate_invalid() })
  .nullable();

const dueDateSchema = z.iso.date({ error: () => m.task_error_due_date_invalid() }).nullable();

/** Every field optional: an update changes only what it names. */
export const taskChangeSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dueDateSchema.optional(),
  estimateMinutes: estimateSchema.optional(),
  ownerId: z.string().optional(),
  /** The whole list of assignees, in order: an update replaces it. */
  assigneeIds: z
    .array(z.string())
    .transform((ids) => [...new Set(ids)])
    .optional(),
  labelIds: z
    .array(z.string())
    .transform((ids) => [...new Set(ids)])
    .optional(),
});

export type TaskChange = z.output<typeof taskChangeSchema>;

/** A new task needs only a title; quick add sends nothing else. */
export const newTaskSchema = taskChangeSchema.extend({ title: titleSchema, columnId: z.string().optional() });

/*===== Label =====*/
export const newLabelSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.label_error_name_required() })
    .max(LABEL_NAME_MAX_LENGTH, { error: () => m.label_error_name_too_long({ max: LABEL_NAME_MAX_LENGTH }) }),
  color: z.enum(LABEL_COLORS),
});

/*===== Status Reason =====*/
/** Why a task is stopped (rule 5). Empty is no reason, which the service refuses. */
export const statusReasonSchema = persianText()
  .max(STATUS_REASON_MAX_LENGTH, { error: () => m.task_error_reason_too_long({ max: STATUS_REASON_MAX_LENGTH }) })
  .optional()
  .transform((reason) => reason || null);

/*===== Forced Move =====*/
/** Why a blocked task is moved into doing or done anyway (rule 4): written as a comment, so it can't be empty. */
export const forceCommentSchema = persianText()
  .min(1, { error: () => m.dependency_error_comment_required() })
  .max(COMMENT_MAX_LENGTH, { error: () => m.comment_error_too_long({ max: COMMENT_MAX_LENGTH }) });
