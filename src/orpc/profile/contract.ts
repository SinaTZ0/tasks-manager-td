import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { mediaSchema } from "#/orpc/media/contract";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";

/*===== Schemas =====*/
/** The signed-in person's own profile: what they can change about themselves. */
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: mediaSchema.nullable(),
});

export type Profile = z.infer<typeof profileSchema>;

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors };

export const profileContract = {
  get: oc.errors(errors).output(profileSchema),
  /**
   * Renames the viewer and sets or clears their picture (an `avatar` they uploaded with `media.upload`). Refused
   * (`INVALID_INPUT`) for an empty or too long name, or a picture that isn't theirs to use.
   */
  update: oc
    .errors(errors)
    .input(z.strictObject({ name: z.string(), avatarMediaId: z.string().nullable() }))
    .output(profileSchema),
};
