import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";

import { Marking } from "#/components/primitive/marking/marking";
import { useNow } from "#/hooks/use-now";
import { columnTitle } from "#/lib/column-title";
import { formatDuration } from "#/lib/duration";
import type { Column, Project } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import type { ColumnStay } from "#/orpc/time/contract";
import { m } from "#/paraglide/messages";
import { timeQuery } from "#/routes/projects_projectKey/queries";

/*===== Spans =====*/

/** A span of time as people read it: `h:mm` under a day, days and hours past that. */
export function formatSpan(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  if (minutes < 24 * 60) return formatDuration(minutes);
  return m.time_span_days({ days: Math.floor(minutes / (24 * 60)), hours: Math.floor(minutes / 60) % 24 });
}

export const secondsBetween = (start: Date, end: number) => Math.max(0, (end - start.getTime()) / 1000);

/**
 * Seconds spent in each column, open stays counted up to `now` (left out while the page hydrates), in board order. A
 * column removed since goes last, under the name it had then.
 */
function timeByColumn({ stays, columns, now }: { stays: ColumnStay[]; columns: Column[]; now: number | null }) {
  const totals = new Map<string, { title: string; seconds: number }>();
  for (const stay of stays) {
    const end = stay.leftAt?.getTime() ?? now;
    if (end === null) continue;
    const column = columns.find((item) => item.id === stay.columnId);
    const total = totals.get(stay.columnId) ?? { title: columnTitle(column ?? stay), seconds: 0 };
    total.seconds += secondsBetween(stay.enteredAt, end);
    totals.set(stay.columnId, total);
  }
  const rank = (id: string) => {
    const index = columns.findIndex((column) => column.id === id);
    return index === -1 ? columns.length : index;
  };
  return [...totals.entries()]
    .toSorted(([a], [b]) => rank(a) - rank(b))
    .map(([columnId, total]) => ({ columnId, ...total }));
}

/*===== Task Time Section =====*/

/**
 * The drawer's time, first in its tracking column: how old the task is (created to done, or to now) and how long it
 * has sat in each column, from its history. Nobody clocks their work: the time in doing is the time it took.
 */
export function TaskTimeSection({ task, project }: { task: TaskDetail; project: Project }) {
  const { data: time } = useQuery(timeQuery({ projectId: project.id, number: task.number }));
  const now = useNow();
  const ageEnd = task.completedAt?.getTime() ?? now;

  return (
    <section aria-labelledby="task-time-title" className="flex flex-col gap-6">
      <h3 id="task-time-title" className="flex items-center gap-2 font-heading text-h4">
        <ClockIcon aria-hidden="true" className="size-4" />
        {m.time_title()}
      </h3>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        <dt className="text-body-sm text-muted-foreground">{task.completedAt ? m.time_age_done() : m.time_age()}</dt>
        <dd>
          <Marking variant="code">{ageEnd === null ? "" : formatSpan(secondsBetween(task.createdAt, ageEnd))}</Marking>
        </dd>
        {time &&
          timeByColumn({ stays: time.stays, columns: project.columns, now }).map(({ columnId, title, seconds }) => (
            <div key={columnId} className="contents">
              <dt className="text-body-sm text-muted-foreground">{m.time_in_column({ column: title })}</dt>
              <dd>
                <Marking variant="code">{formatSpan(seconds)}</Marking>
              </dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
