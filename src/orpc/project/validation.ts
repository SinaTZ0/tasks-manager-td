import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import {
  COLUMN_NAME_MAX_LENGTH,
  PROJECT_KEY_PATTERN,
  PROJECT_NAME_MAX_LENGTH,
  WIP_LIMIT_MAX,
} from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== Project =====*/
export const projectNameSchema = persianText()
  .min(1, { error: () => m.project_error_name_required() })
  .max(PROJECT_NAME_MAX_LENGTH, { error: () => m.project_error_name_too_long({ max: PROJECT_NAME_MAX_LENGTH }) });

export const newProjectSchema = z.object({
  name: projectNameSchema,
  // Typed in either case; stored in capitals.
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PROJECT_KEY_PATTERN, { error: () => m.project_error_key_invalid() }),
  memberIds: z.array(z.string()).transform((ids) => [...new Set(ids)]),
});

/*===== Column =====*/
export const columnChangeSchema = z.object({
  // Empty text means "the kind's own name".
  name: persianText()
    .max(COLUMN_NAME_MAX_LENGTH, { error: () => m.column_error_name_too_long({ max: COLUMN_NAME_MAX_LENGTH }) })
    .nullable()
    .transform((value) => value || null),
  wipLimit: z
    .number()
    .int()
    .min(1, { error: () => m.column_error_wip_invalid({ max: WIP_LIMIT_MAX }) })
    .max(WIP_LIMIT_MAX, { error: () => m.column_error_wip_invalid({ max: WIP_LIMIT_MAX }) })
    .nullable(),
});
