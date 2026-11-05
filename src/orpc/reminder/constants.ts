/*===== Reminder Constants =====*/
// Browser-safe: the reminder key steps through these, and the note's field counts against the limit.

/** How long a reminder's note may be. */
export const REMINDER_NOTE_MAX_LENGTH = 200;

/** What the reminder key steps through, in minutes: 30 on the first press, half an hour more on each after it. */
export const REMINDER_STEPS = [30, 60, 90, 120, 150, 180];

/** Where a reminder picked by the day lands: the time field's first reading, and "tomorrow" in the bell. */
export const REMINDER_MORNING = "09:00";
