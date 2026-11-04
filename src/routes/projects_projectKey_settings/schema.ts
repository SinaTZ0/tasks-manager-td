import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import { COLUMN_NAME_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== Forms =====*/
// Written for the forms' messages; the server's `validation.ts` is the final authority.

export const projectNameFormSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.project_error_name_required() })
    .max(PROJECT_NAME_MAX_LENGTH, { error: () => m.project_error_name_too_long({ max: PROJECT_NAME_MAX_LENGTH }) }),
});

export type ProjectNameFormValues = z.infer<typeof projectNameFormSchema>;

// Every column at once, by id. An empty name is the kind's own name; a null limit is no limit. The limit is stepped by
// keys that stop at its bounds, so only the name can be typed wrong.
export const columnsFormSchema = z.object({
  columns: z.record(
    z.string(),
    z.object({
      name: persianText().max(COLUMN_NAME_MAX_LENGTH, {
        error: () => m.column_error_name_too_long({ max: COLUMN_NAME_MAX_LENGTH }),
      }),
      wipLimit: z.number().nullable(),
    }),
  ),
});

export type ColumnsFormValues = z.infer<typeof columnsFormSchema>;

export const newColumnFormSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.column_error_name_required() })
    .max(COLUMN_NAME_MAX_LENGTH, { error: () => m.column_error_name_too_long({ max: COLUMN_NAME_MAX_LENGTH }) }),
});

export type NewColumnFormValues = z.infer<typeof newColumnFormSchema>;
