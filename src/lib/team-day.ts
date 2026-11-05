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

const hourParts = new Intl.DateTimeFormat("en-CA", { timeZone: TEAM_TIME_ZONE, hour: "numeric", hourCycle: "h23" });

/** The hour on the team's clock at `now` (default: this moment), from 0 to 23. */
export function teamHour(now: number | Date = Date.now()): number {
  return Number(hourParts.formatToParts(now).find((part) => part.type === "hour")?.value);
}

const clockParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const readClock = (at: number | Date) =>
  Object.fromEntries(clockParts.formatToParts(at).map((part) => [part.type, part.value]));

/** What the team's clock reads at `at`, as `09:30`. */
export function teamTime(at: number | Date): string {
  const { hour, minute } = readClock(at);
  return `${hour}:${minute}`;
}

/**
 * The moment the team's clock reads `time` (`09:30`) on `date` (ISO), whatever the laptop's clock is set to. The zone's
 * offset is read rather than written down, so a change to Iran's clocks needs nothing here.
 */
export function teamMoment({ date, time }: { date: string; time: string }): Date {
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  const { year, month, day, hour, minute, second } = readClock(asUtc);
  const read = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return new Date(asUtc - (read - asUtc));
}

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
