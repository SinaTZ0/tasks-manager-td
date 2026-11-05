import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import { REMINDER_NOTE_MAX_LENGTH } from "#/orpc/reminder/constants";
import { m } from "#/paraglide/messages";

/*===== Reminder =====*/
// That the time hasn't passed is checked in the service, which knows the time.
export const newReminderSchema = z.object({
  remindAt: z.date(),
  // Empty text means "no note".
  note: persianText()
    .max(REMINDER_NOTE_MAX_LENGTH, { error: () => m.reminder_error_note_too_long({ max: REMINDER_NOTE_MAX_LENGTH }) })
    .default("")
    .transform((value) => value || null),
});
