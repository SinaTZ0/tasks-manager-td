import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";

/*===== Schemas =====*/
/** Where a card is now (a move) or where its copy is. */
export const placedSchema = z.object({ projectKey: z.string(), number: z.number().int() });

const transferInput = z.strictObject({
  projectId: z.string(),
  taskId: z.string(),
  targetProjectId: z.string(),
  /** The kind of column it goes to in the target; the kind it is in now by default. */
  columnKind: z.enum(COLUMN_KINDS).optional(),
});

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task the project doesn't have. Moving and copying are
// for admins, like creating a card (`requireAdminMiddleware`).
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };

export const transferContract = {
  /** Moves a card to another project, where it takes a new number; its old code keeps working. */
  move: oc.errors(errors).input(transferInput).output(placedSchema),
  /** Copies a card into another project. */
  copy: oc.errors(errors).input(transferInput).output(placedSchema),
  /** Where the card an old code named is now, or null (never moved, or in a project the viewer can't open). */
  resolve: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), number: z.number().int() }))
    .output(placedSchema.nullable()),
};
