import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import { PROJECT_KEY_PATTERN, PROJECT_NAME_MAX_LENGTH } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== New Project Form =====*/
// Written for the form's messages; the server's `validation.ts` is the final authority.
export const newProjectFormSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.project_error_name_required() })
    .max(PROJECT_NAME_MAX_LENGTH, { error: () => m.project_error_name_too_long({ max: PROJECT_NAME_MAX_LENGTH }) }),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PROJECT_KEY_PATTERN, { error: () => m.project_error_key_invalid() }),
  memberIds: z.array(z.string()),
});

export type NewProjectFormValues = z.input<typeof newProjectFormSchema>;
export type NewProjectFormOutput = z.output<typeof newProjectFormSchema>;
