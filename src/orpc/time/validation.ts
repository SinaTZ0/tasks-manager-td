import { z } from "zod";

import { persianText } from "#/lib/persian-text";
import { TIME_ENTRY_MAX_MINUTES, TIME_NOTE_MAX_LENGTH } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Manual Entry =====*/
/**
 * The latest day an entry may name: tomorrow in UTC. The server doesn't know the person's time zone, and in Tehran
 * (UTC+3:30) "today" is already tomorrow in UTC for the first hours after midnight.
 */
function latestEntryDay(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

/** "Worked 2h yesterday": a day that isn't in the future, a duration up to a day, and an optional note. */
export const timeEntrySchema = z.object({
  taskId: z.string(),
  date: z.iso
    .date({ error: () => m.time_error_date_invalid() })
    .refine((date) => date <= latestEntryDay(new Date()), { error: () => m.time_error_date_future() }),
  minutes: z
    .number()
    .int()
    .min(1, { error: () => m.time_error_minutes_invalid({ max: TIME_ENTRY_MAX_MINUTES / 60 }) })
    .max(TIME_ENTRY_MAX_MINUTES, { error: () => m.time_error_minutes_invalid({ max: TIME_ENTRY_MAX_MINUTES / 60 }) }),
  note: persianText()
    .max(TIME_NOTE_MAX_LENGTH, { error: () => m.time_error_note_too_long({ max: TIME_NOTE_MAX_LENGTH }) })
    .optional()
    .transform((note) => note || null),
});
