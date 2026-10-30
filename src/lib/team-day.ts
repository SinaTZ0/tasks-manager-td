/*===== Team Day =====*/
// "Today" is the team's, not each browser's: the server and every browser work out due dates in one time zone, so a
// card is overdue at the same moment for everyone, whatever the laptop's clock is set to. Browser-safe.

/** The team's time zone: every "today", "overdue" and "due this week" is reckoned in it. */
export const TEAM_TIME_ZONE = "Asia/Tehran";

/** The team's week ends on Friday (the Iranian weekend): "due this week" runs from today through Friday. */
const WEEK_LAST_DAY = 5;

// Only used to read the calendar date in the team's zone, never shown, so a fixed locale is fine here: `en-CA` gives
// the parts as numbers.
const dayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The team's calendar date at `now` (default: this moment), as ISO (`2026-10-30`). */
export function teamToday(now: number | Date = Date.now()): string {
  const parts = Object.fromEntries(dayParts.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** An ISO date `days` later (or earlier, when negative). */
export function addDays({ date, days }: { date: string; days: number }): string {
  const moved = new Date(`${date}T12:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both ISO dates): 1 for tomorrow, -2 for the day before yesterday. */
export function daysBetween({ from, to }: { from: string; to: string }): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** The last day (Friday) of the team's week that `date` is in, as ISO. */
export function teamWeekEnd(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays({ date, days: (WEEK_LAST_DAY - weekday + 7) % 7 });
}
