import { z } from "zod";

import { toLatinDigits } from "#/lib/digits";
import { persianText } from "#/lib/persian-text";
import { COLUMN_NAME_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH, WIP_LIMIT_MAX } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== Forms =====*/
// Written for the forms' messages; the server's `validation.ts` is the final authority.

export const projectNameFormSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.project_error_name_required() })
    .max(PROJECT_NAME_MAX_LENGTH, { error: () => m.project_error_name_too_long({ max: PROJECT_NAME_MAX_LENGTH }) }),
});

export type ProjectNameFormValues = z.infer<typeof projectNameFormSchema>;

// Both fields are text inputs: an empty name is the kind's own name, an empty limit is no limit.
export const columnFormSchema = z.object({
  name: persianText().max(COLUMN_NAME_MAX_LENGTH, {
    error: () => m.column_error_name_too_long({ max: COLUMN_NAME_MAX_LENGTH }),
  }),
  // Persian keyboards type Persian digits.
  wipLimit: z
    .string()
    .trim()
    .transform(toLatinDigits)
    .refine((value) => value === "" || (/^\d+$/.test(value) && +value >= 1 && +value <= WIP_LIMIT_MAX), {
      error: () => m.column_error_wip_invalid({ max: WIP_LIMIT_MAX }),
    }),
});

export type ColumnFormValues = z.input<typeof columnFormSchema>;
export type ColumnFormOutput = z.output<typeof columnFormSchema>;
