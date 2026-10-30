import { oc } from "@orpc/contract";
import { z } from "zod";

import { ATTACHMENT_KINDS } from "#/orpc/attachment/constants";
import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
/** A file or link on a card, as the drawer lists it, oldest first. */
export const attachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(ATTACHMENT_KINDS),
  /** A file's name, or a link's title (its address when it has none). */
  name: z.string(),
  /** Where it opens: the file in the bucket (an image shows, anything else downloads), or the link's address. */
  url: z.string(),
  /** An image file's smaller copy, with its pixel size; null for other files and links. */
  preview: z.object({ url: z.string(), width: z.number().int(), height: z.number().int() }).nullable(),
  /** A file's size in bytes; null for a link. */
  size: z.number().int().nullable(),
  addedBy: z.string(),
  createdAt: z.date(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task or attachment the project doesn't have. Adding is
// for editors (`requireEditorMiddleware`); removing is for whoever added it, or an admin (the service's rule).
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };

export const attachmentContract = {
  /** Uploads a file to the card. Its size and name are checked by the service. */
  addFile: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string(), file: z.file() }))
    .output(attachmentSchema),
  /** Adds a link (http or https) with an optional title. */
  addLink: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string(), url: z.string(), title: z.string().optional() }))
    .output(attachmentSchema),
  remove: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), attachmentId: z.string() }))
    .output(z.void()),
};
