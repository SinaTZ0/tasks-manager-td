import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { formatDate, isoToDate } from "#/lib/locale";
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

/** The warning in words, so the colour is never the only cue: "Due today", "Due tomorrow", "3 days late". */
function dueWords(days: number): string {
  if (days === 0) return m.due_today();
  if (days === 1) return m.due_tomorrow();
  if (days === -1) return m.due_late_one();
  return m.due_late({ days: -days });
}

/*===== Due Mark =====*/

/**
 * A due date as the instrument prints it: the date, and once it comes close a lit LED with words beside it (yellow
 * for today or tomorrow, the action red once late). Used on the card, in the drawer and on My Tasks.
 */
export function DueMark({
  dueDate,
  finished = false,
  format = { day: "numeric", month: "short" },
}: {
  /** ISO date (`2026-11-04`). */
  dueDate: string;
  finished?: boolean;
  format?: Intl.DateTimeFormatOptions;
}) {
  const { tone, days } = dueState({ dueDate, finished });

  return (
    <span className="inline-flex items-center gap-1.5">
      {tone && <Led signal={tone === "late" ? "action" : "attention"} state="on" size="sm" />}
      <Marking>
        <span className="sr-only">{m.task_due_label()}: </span>
        {formatDate(isoToDate(dueDate), format)}
      </Marking>
      {tone && <span className="text-caption font-semibold">{dueWords(days)}</span>}
    </span>
  );
}
