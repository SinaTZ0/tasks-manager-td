import { formatDate, formatNumber } from "#/lib/locale";
import { addDays, TEAM_TIME_ZONE, teamMoment, teamToday } from "#/lib/team-day";
import { REMINDER_MORNING } from "#/orpc/reminder/constants";
import { m } from "#/paraglide/messages";

/*===== Reminder Time =====*/
// How a reminder's time reads. It is always on the team's clock, like the team's day, so two people see the same hour.

const ON_TEAM_CLOCK = { timeZone: TEAM_TIME_ZONE };

/** A step of the reminder key as it prints: «۳۰ دقیقه», «۱٫۵ ساعت». */
export function stepLabel(minutes: number): string {
  return minutes < 60 ? m.reminder_minutes({ minutes }) : m.reminder_hours({ hours: minutes / 60 });
}

/** How long is left, short enough for the card's clip: «۱:۳۰» inside a day, the date after that. */
export function leftLabel({ at, now }: { at: Date; now: number }): string {
  // Rounded, not rounded up: `useNow` runs up to a second behind, which would print a fresh 30 minutes as 31.
  const minutes = Math.max(0, Math.round((at.getTime() - now) / 60_000));
  if (minutes >= 24 * 60) return formatDate(at, { ...ON_TEAM_CLOCK, day: "numeric", month: "short" });
  const rest = formatNumber(minutes % 60, { minimumIntegerDigits: 2 });
  return `${formatNumber(Math.floor(minutes / 60))}:${rest}`;
}

/** When it will ring, as words: «ساعت ۱۴:۳۰», and the day too unless it is today. */
export function whenLabel(at: Date): string {
  const time = formatDate(at, { ...ON_TEAM_CLOCK, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (teamToday(at) === teamToday()) return m.reminder_when_today({ time });
  return m.reminder_when_day({ date: formatDate(at, { ...ON_TEAM_CLOCK, day: "numeric", month: "long" }), time });
}

/** Tomorrow morning on the team's clock, for putting a reminder off. */
export const tomorrowMorning = () =>
  teamMoment({ date: addDays({ date: teamToday(), days: 1 }), time: REMINDER_MORNING });
