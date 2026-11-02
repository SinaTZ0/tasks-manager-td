import { toLatinDigits } from "#/lib/digits";
import { formatNumber } from "#/lib/locale";

/*===== Durations =====*/
// Estimates are whole minutes. People type them as `1:30`, `2` (hours), `45m` or `1.5h`, in Persian or Latin digits;
// the app prints them as `h:mm`.

const MINUTES = /^(\d+)\s*(m|min|د|دقیقه)$/i;
const HOURS = /^(\d+(?:\.\d+)?)\s*(h|hr|س|ساعت)?$/i;
const CLOCK = /^(\d+):([0-5]\d)$/;

/**
 * Reads a typed duration as minutes.
 *
 * @returns The minutes, `null` for empty text, or `undefined` when the text isn't a duration.
 */
export function parseDuration(text: string): number | null | undefined {
  const value = toLatinDigits(text).trim().replace("٫", ".").replace("/", ".");
  if (value === "") return null;

  const clock = CLOCK.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = MINUTES.exec(value);
  if (minutes) return Number(minutes[1]);
  const hours = HOURS.exec(value);
  if (hours) return Math.round(Number(hours[1]) * 60);
  return undefined;
}

/** Minutes as `h:mm` (`1:30`), in the locale's digits. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${formatNumber(hours)}:${formatNumber(rest, { minimumIntegerDigits: 2 })}`;
}
