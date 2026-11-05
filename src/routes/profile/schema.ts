import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";
import { m } from "#/paraglide/messages";

/*===== Password Form =====*/
// Written for the form's messages; Better-Auth checks the lengths again and the current password itself. Passwords are
// sent exactly as typed. The repeat is only here: nobody is emailed a way back from a mistyped password.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: () => m.auth_form_password_required() }),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, { error: () => m.team_error_password_too_short({ min: PASSWORD_MIN_LENGTH }) })
      .max(PASSWORD_MAX_LENGTH, { error: () => m.team_error_password_too_long({ max: PASSWORD_MAX_LENGTH }) }),
    repeatPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.repeatPassword, {
    path: ["repeatPassword"],
    error: () => m.profile_password_mismatch(),
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
