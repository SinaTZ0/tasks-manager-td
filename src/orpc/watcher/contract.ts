import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";
import { personSchema } from "#/orpc/project/contract";

/*===== Procedures =====*/
// Watching is a personal setting, so a viewer may do it too. `projectAccessErrors` carries NOT_FOUND, which also
// answers a task the project doesn't have.
const errors = { ...commonErrors, ...authErrors, ...projectAccessErrors };

const taskInput = z.strictObject({ projectId: z.string(), taskId: z.string() });

export const watcherContract = {
  /** Starts watching a live card; watching it again changes nothing. Returns its watchers. */
  watch: oc.errors(errors).input(taskInput).output(z.array(personSchema)),
  /** Stops watching a card. Returns its watchers. */
  unwatch: oc.errors(errors).input(taskInput).output(z.array(personSchema)),
};
