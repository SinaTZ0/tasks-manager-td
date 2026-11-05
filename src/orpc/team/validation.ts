import { z } from "zod";

import { NAME_MAX_LENGTH } from "#/lib/auth-constants";
import { persianText } from "#/lib/persian-text";
import { USER_ROLES } from "#/lib/user-constants";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";
import { m } from "#/paraglide/messages";

/*===== Password =====*/
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: () => m.team_error_password_too_short({ min: PASSWORD_MIN_LENGTH }) })
  .max(PASSWORD_MAX_LENGTH, { error: () => m.team_error_password_too_long({ max: PASSWORD_MAX_LENGTH }) });

/*===== New Member =====*/
// The name is normalized like the app's other free text; the email is only lowercased, and the password is kept exactly
// as typed.
export const newMemberSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.team_error_name_required() })
    .max(NAME_MAX_LENGTH, { error: () => m.team_error_name_too_long({ max: NAME_MAX_LENGTH }) }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: () => m.team_error_email_invalid() })),
  password: passwordSchema,
  role: z.enum(USER_ROLES),
});

export type NewMember = z.output<typeof newMemberSchema>;

/*===== Password Reset =====*/
export const passwordResetSchema = z.object({ userId: z.string(), password: passwordSchema });
