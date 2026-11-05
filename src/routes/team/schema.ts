import { z } from "zod";

import { NAME_MAX_LENGTH } from "#/lib/auth-constants";
import { persianText } from "#/lib/persian-text";
import { USER_ROLES } from "#/lib/user-constants";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";
import { m } from "#/paraglide/messages";

/*===== New Teammate Form =====*/
// Written for the form's messages; the server's `validation.ts` is the final authority. Only the name is free text:
// the email and password are sent as typed.
export const newMemberFormSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.team_error_name_required() })
    .max(NAME_MAX_LENGTH, { error: () => m.team_error_name_too_long({ max: NAME_MAX_LENGTH }) }),
  email: z.email({ error: () => m.team_error_email_invalid() }),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, { error: () => m.team_error_password_too_short({ min: PASSWORD_MIN_LENGTH }) })
    .max(PASSWORD_MAX_LENGTH, { error: () => m.team_error_password_too_long({ max: PASSWORD_MAX_LENGTH }) }),
  role: z.enum(USER_ROLES),
});

export type NewMemberFormValues = z.infer<typeof newMemberFormSchema>;

/*===== Reset Password Form =====*/
export const resetPasswordFormSchema = z.object({ password: newMemberFormSchema.shape.password });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
