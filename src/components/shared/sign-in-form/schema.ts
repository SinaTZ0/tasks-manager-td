import { z } from "zod";

import { m } from "#/paraglide/messages";

/*===== Sign In =====*/
// Written for the form's messages. The server (Better-Auth) is the final authority.
export const signInSchema = z.object({
  email: z.email({ error: () => m.auth_form_email_invalid() }),
  password: z.string().min(1, { error: () => m.auth_form_password_required() }),
});

export type SignInValues = z.infer<typeof signInSchema>;
