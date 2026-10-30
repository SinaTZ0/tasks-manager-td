import { oc } from "@orpc/contract";
import { z } from "zod";

import { USER_STATUSES } from "#/lib/user-constants";
import { commonErrors, errorDataSchema } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";

/*===== Schemas =====*/
export const columnSchema = z.object({
  id: z.string(),
  kind: z.enum(COLUMN_KINDS),
  /** Null until an admin renames it: the page prints the kind's own name, in the reader's language. */
  name: z.string().nullable(),
  position: z.string(),
  wipLimit: z.number().int().nullable(),
});

export type Column = z.infer<typeof columnSchema>;

/** A member as the project's pages show them. A deactivated member stays listed, so their name stays on their work. */
export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(USER_STATUSES),
  /** Their picture's small variant, or null for none: the cap then shows their initial. */
  avatarUrl: z.string().nullable(),
});

export type Person = z.infer<typeof personSchema>;

export const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  members: z.array(personSchema),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectSchema = projectSummarySchema.extend({
  /** In board order, the cancelled column included. */
  columns: z.array(columnSchema),
});

export type Project = z.infer<typeof projectSchema>;

// Structure only. Trimming, limits and the key's uniqueness are checked by the service.
const createProjectInputSchema = z.strictObject({
  name: z.string(),
  key: z.string(),
  memberIds: z.array(z.string()),
});

const renameProjectInputSchema = z.strictObject({ projectId: z.string(), name: z.string() });

const setMemberInputSchema = z.strictObject({ projectId: z.string(), userId: z.string(), member: z.boolean() });

const updateColumnInputSchema = z.strictObject({
  projectId: z.string(),
  columnId: z.string(),
  /** Null (or empty) goes back to the kind's own name. */
  name: z.string().nullable(),
  wipLimit: z.number().int().nullable(),
});

/*===== Errors =====*/
const notFoundErrors = {
  NOT_FOUND: { message: "Project not found.", data: errorDataSchema },
};

/*===== Procedures =====*/
const adminErrors = { ...commonErrors, ...authErrors, ...roleErrors };

const moveColumnInputSchema = z.strictObject({
  projectId: z.string(),
  columnId: z.string(),
  /** The key the board computed between the column's new neighbours (`src/lib/position.ts`). */
  position: z.string(),
});

export const projectContract = {
  /** The viewer's projects; an admin's are all of them. */
  list: oc.errors({ ...commonErrors, ...authErrors }).output(z.array(projectSummarySchema)),
  get: oc
    .errors({ ...commonErrors, ...authErrors, ...notFoundErrors })
    .input(z.strictObject({ key: z.string() }))
    .output(projectSchema),
  create: oc.errors(adminErrors).input(createProjectInputSchema).output(projectSummarySchema),
  rename: oc
    .errors({ ...adminErrors, ...notFoundErrors })
    .input(renameProjectInputSchema)
    .output(projectSummarySchema),
  setMember: oc
    .errors({ ...adminErrors, ...notFoundErrors })
    .input(setMemberInputSchema)
    .output(projectSummarySchema),
  updateColumn: oc
    .errors({ ...adminErrors, ...notFoundErrors })
    .input(updateColumnInputSchema)
    .output(columnSchema),
  moveColumn: oc
    .errors({ ...adminErrors, ...notFoundErrors })
    .input(moveColumnInputSchema)
    .output(columnSchema),
};
