import { z } from "zod";

import { NAME_MAX_LENGTH } from "#/lib/auth-constants";
import { persianText } from "#/lib/persian-text";
import { PING_MESSAGE_MAX_LENGTH } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Profile =====*/
/** The same name rule as a new member's (`team/validation.ts`). */
export const profileChangeSchema = z.object({
  name: persianText()
    .min(1, { error: () => m.team_error_name_required() })
    .max(NAME_MAX_LENGTH, { error: () => m.team_error_name_too_long({ max: NAME_MAX_LENGTH }) }),
  avatarMediaId: z.string().nullable(),
  pingMessage: persianText().max(PING_MESSAGE_MAX_LENGTH, {
    error: () => m.profile_error_ping_too_long({ max: PING_MESSAGE_MAX_LENGTH }),
  }),
});
