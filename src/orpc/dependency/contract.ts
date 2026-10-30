import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
/** "`taskId` waits for `blockerId`": two tasks of the project. */
const linkInputSchema = z.strictObject({ projectId: z.string(), taskId: z.string(), blockerId: z.string() });

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers a task the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...projectAccessErrors };

export const dependencyContract = {
  /** Refused (`INVALID_INPUT` on `blockerId`) for the task itself or a link that would close a loop. */
  add: oc.errors(errors).input(linkInputSchema).output(z.void()),
  remove: oc.errors(errors).input(linkInputSchema).output(z.void()),
};
