import { oc } from "@orpc/contract";
import { z } from "zod";

import { USER_ROLES, USER_STATUSES } from "#/lib/user-constants";
import { commonErrors, errorDataSchema } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";

/*===== Schemas =====*/
/** A person on the team, as the admin's user list shows them. */
export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
  createdAt: z.date(),
  /** Open tasks assigned to them (live, not done or cancelled). */
  openTasks: z.number().int(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// Structure only. Trimming, limits and the email's uniqueness are checked by the service.
const createMemberInputSchema = z.strictObject({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  role: z.enum(USER_ROLES),
});

const setRoleInputSchema = z.strictObject({ userId: z.string(), role: z.enum(USER_ROLES) });

const setStatusInputSchema = z.strictObject({ userId: z.string(), status: z.enum(USER_STATUSES) });

const resetPasswordInputSchema = z.strictObject({ userId: z.string(), password: z.string() });

/*===== Errors =====*/
const notFoundErrors = {
  NOT_FOUND: { message: "User not found.", data: errorDataSchema },
};

// The change would leave the team without an active admin, or is an admin's change to their own account.
const conflictErrors = {
  CONFLICT: { message: "This change would lock the team out.", data: errorDataSchema },
};

/*===== Procedures =====*/
// Admin only: everyone else meets their teammates through the projects they share.
const adminErrors = { ...commonErrors, ...authErrors, ...roleErrors };

export const teamContract = {
  list: oc.errors(adminErrors).output(z.array(teamMemberSchema)),
  create: oc.errors(adminErrors).input(createMemberInputSchema).output(teamMemberSchema),
  setRole: oc
    .errors({ ...adminErrors, ...notFoundErrors, ...conflictErrors })
    .input(setRoleInputSchema)
    .output(teamMemberSchema),
  setStatus: oc
    .errors({ ...adminErrors, ...notFoundErrors, ...conflictErrors })
    .input(setStatusInputSchema)
    .output(teamMemberSchema),
  /**
   * Gives a teammate a new password and signs them out everywhere. Refused (`CONFLICT`) for the admin's own account,
   * which changes on the profile page with the current password.
   */
  resetPassword: oc.errors({ ...adminErrors, ...notFoundErrors, ...conflictErrors }).input(resetPasswordInputSchema),
};
