import { addDays, daysBetween } from "#/lib/team-day";
import type { Locale } from "#/paraglide/runtime";

/*===== Calendar Months =====*/
// The calendar shows the reader's calendar: Jalali (Solar Hijri) months in Persian, Gregorian ones in English. Days are
// ISO dates (`2026-10-30`), the team's (`src/lib/team-day.ts`); only the month boundaries depend on the calendar, and
// `Intl` knows both. Weeks start on Saturday in both, as the team's week does.

/** The day of the month an ISO date is in the locale's calendar, read at UTC noon so no time zone shifts it. */
const dayFormats = new Map<Locale, Intl.DateTimeFormat>();
function dayOfMonth({ date, locale }: { date: string; locale: Locale }): number {
  let format = dayFormats.get(locale);
  if (!format) {
    // Only read as a number, never shown: Latin digits whatever the locale.
    format = new Intl.DateTimeFormat(`en-u-ca-${locale === "fa" ? "persian" : "gregory"}-nu-latn`, {
      timeZone: "UTC",
      day: "numeric",
    });
    dayFormats.set(locale, format);
  }
  return Number(format.formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === "day")?.value);
}

/** The first day of the month `date` is in. */
export function monthStart({ date, locale }: { date: string; locale: Locale }): string {
  return addDays({ date, days: 1 - dayOfMonth({ date, locale }) });
}

export type Month = {
  /** Its first day. */
  first: string;
  /** Its days, in order. */
  days: string[];
  /** Blank cells before the first day, so it sits under its weekday (Saturday first). */
  leading: number;
  /** The first days of the months before and after it. */
  previous: string;
  next: string;
};

/** The month starting on `first` (a `monthStart`), laid out for a grid of Saturday-to-Friday weeks. */
export function monthOf({ first, locale }: { first: string; locale: Locale }): Month {
  // 32 days on is always inside the next month, whichever calendar.
  const next = monthStart({ date: addDays({ date: first, days: 32 }), locale });
  const length = daysBetween({ from: first, to: next });
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  return {
    first,
    days: Array.from({ length }, (_, index) => addDays({ date: first, days: index })),
    // Saturday is 6 in `getUTCDay`: it becomes 0, Sunday 1, … Friday 6.
    leading: (weekday + 1) % 7,
    previous: monthStart({ date: addDays({ date: first, days: -1 }), locale }),
    next,
  };
}

/** A Saturday, from which the weekday headings are read. */
export const A_SATURDAY = "2026-10-31";
