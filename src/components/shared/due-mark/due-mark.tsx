import { CalendarClockIcon } from "lucide-react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { formatDate, formatNumber, isoToDate } from "#/lib/locale";
import { daysBetween, teamToday } from "#/lib/team-day";
import { m } from "#/paraglide/messages";

/*===== Due State =====*/

/** How close a due date is: `late` once past, `soon` on the day and the day before, otherwise nothing to warn of. */
export type DueTone = "late" | "soon" | null;

/**
 * Where a due date stands against the team's today (`src/lib/team-day.ts`, so everyone sees the same): its tone and
 * the whole days from today (negative once late). A finished task (done, cancelled or archived) never warns.
 */
export function dueState({ dueDate, finished }: { dueDate: string; finished: boolean }): {
  tone: DueTone;
  days: number;
} {
  const days = daysBetween({ from: teamToday(), to: dueDate });
  if (finished) return { tone: null, days };
  return { tone: days < 0 ? "late" : days <= 1 ? "soon" : null, days };
}

/**
 * The days to a due date in words, so the colour is never the only cue: "5 days left", "Due today", "Due tomorrow",
 * "3 days late".
 */
function dueWords(days: number): string {
  if (days > 1) return m.due_in_days({ days });
  if (days === 0) return m.due_today();
  if (days === 1) return m.due_tomorrow();
  if (days === -1) return m.due_late_one();
  return m.due_late({ days: -days });
}

/*===== Due Mark =====*/

/**
 * A due date as the instrument prints it: the date, and once it comes close a lit LED with words beside it (yellow
 * for today or tomorrow, the action red once late). Used on the card, in the drawer and on My Tasks.
 *
 * `brief` is for the card's footer, where room is short and the question is "how long have I got": a calendar
 * mark and the days left, like the footer's other counts, or the warning words once it comes close ("Due today",
 * "3 days late"). The date is spoken and shows on hover. A finished task has nothing left to count, so it keeps its
 * date.
 */
export function DueMark({
  dueDate,
  finished = false,
  brief = false,
  format = { day: "numeric", month: "short" },
}: {
  /** ISO date (`2026-11-04`). */
  dueDate: string;
  finished?: boolean;
  brief?: boolean;
  format?: Intl.DateTimeFormatOptions;
}) {
  const { tone, days } = dueState({ dueDate, finished });
  const date = (
    <>
      <span className="sr-only">{m.task_due_label()}: </span>
      {formatDate(isoToDate(dueDate), format)}
    </>
  );

  if (brief && !finished) {
    return (
      <span className="inline-flex items-center gap-1" title={formatDate(isoToDate(dueDate), format)}>
        <span className="sr-only">
          {date}, {dueWords(days)}
        </span>
        {tone ? (
          <>
            <Led signal={tone === "late" ? "action" : "attention"} state="on" size="sm" />
            <span aria-hidden="true" className="text-caption font-semibold">
              {dueWords(days)}
            </span>
          </>
        ) : (
          <>
            <CalendarClockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            <Marking variant="reading" aria-hidden="true">
              {formatNumber(days)}
            </Marking>
          </>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {tone && <Led signal={tone === "late" ? "action" : "attention"} state="on" size="sm" />}
      <Marking variant="reading">{date}</Marking>
      {tone && <span className="text-caption font-semibold">{dueWords(days)}</span>}
    </span>
  );
}
