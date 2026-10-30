import { oc } from "@orpc/contract";
import { z } from "zod";

import type { RichTextDoc } from "#/lib/rich-text";
import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
export const commentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  /** By name: someone who left the project still signs their comments. */
  authorName: z.string(),
  authorAvatarUrl: z.string().nullable(),
  /** The Tiptap document; null once deleted. */
  body: z.custom<RichTextDoc>((value) => typeof value === "object" && value !== null).nullable(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  deleted: z.boolean(),
});

export type Comment = z.infer<typeof commentSchema>;

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task or comment the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };
/** The document is checked by the service (`commentBodySchema`), so its messages are in the reader's language. */
const bodySchema = z.unknown();

export const commentContract = {
  /** A task's thread, oldest first. A deleted comment stays as a placeholder without its text. */
  list: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string() }))
    .output(z.array(commentSchema)),
  /** Refused (`INVALID_INPUT` on `body`) for an empty, broken or too long document. Mentioned members are told. */
  add: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string(), body: bodySchema }))
    .output(commentSchema),
  /** Only the author can edit; anyone else gets `INVALID_INPUT`. People newly mentioned are told. */
  edit: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), commentId: z.string(), body: bodySchema }))
    .output(commentSchema),
  /** Only the author can delete. The text goes; the history keeps that it was there. */
  remove: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), commentId: z.string() }))
    .output(z.void()),
};
