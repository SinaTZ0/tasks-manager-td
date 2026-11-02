import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { Progress, ProgressLabel, ProgressValue } from "#/components/primitive/progress/progress";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { useNow } from "#/hooks/use-now";
import { columnTitle } from "#/lib/column-title";
import { formatClock, formatDuration } from "#/lib/duration";
import { formatDate, formatNumber } from "#/lib/locale";
import type { Column, Person, Project } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import type { ColumnStay, TimeLog } from "#/orpc/time/contract";
import { m } from "#/paraglide/messages";
import { TaskStatusPanel } from "#/routes/projects_projectKey/components/task-status-panel";
import { timeQuery } from "#/routes/projects_projectKey/queries";

/*===== Spans =====*/

/** A span of time as people read it: `h:mm` under a day, days and hours past that. */
function formatSpan(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  if (minutes < 24 * 60) return formatDuration(minutes);
  return m.time_span_days({ days: Math.floor(minutes / (24 * 60)), hours: Math.floor(minutes / 60) % 24 });
}

const secondsBetween = (start: Date, end: number) => Math.max(0, (end - start.getTime()) / 1000);

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

/** One person's time on the task: their logs' total, open ones counted up to `now`, and whether their clock runs. */
type PersonTime = { userId: string; seconds: number; running: boolean };

/**
 * Each person's time on the task, most first. A running log counts up to `now` (left out while the page hydrates), so
 * the meters tick with the clock.
 */
function timeByPerson({ logs, now }: { logs: TimeLog[]; now: number | null }): PersonTime[] {
  const totals = new Map<string, PersonTime>();
  for (const log of logs) {
    const total = totals.get(log.userId) ?? { userId: log.userId, seconds: 0, running: false };
    const end = log.endedAt?.getTime() ?? now;
    if (end !== null) total.seconds += secondsBetween(log.startedAt, end);
    if (!log.endedAt) total.running = true;
    totals.set(log.userId, total);
  }
  return [...totals.values()].toSorted((a, b) => b.seconds - a.seconds);
}

/*===== Task Time Section =====*/

/**
 * The drawer's time, first in its tracking column: the clock's face (the task's state and its time spent, ticking while
 * a clock runs), how long each person has worked on it (a level meter each, like the channels on a mixer, the one who
 * worked most at full scale), how old the task is (created to done, or to now), how long it has sat in each column
 * (from its history), and every stretch of work logged on it. The timer is the only way time is logged.
 */
export function TaskTimeSection({
  task,
  project,
  people,
}: {
  task: TaskDetail;
  project: Project;
  people: Map<string, Person>;
}) {
  const { data: time } = useQuery(timeQuery({ projectId: project.id, number: task.number }));
  const now = useNow();
  const ageEnd = task.completedAt?.getTime() ?? now;

  return (
    <section aria-labelledby="task-time-title" className="flex flex-col gap-6">
      <h3 id="task-time-title" className="flex items-center gap-2 font-heading text-h4">
        <ClockIcon aria-hidden="true" className="size-4" />
        {m.time_title()}
      </h3>
      <TaskStatusPanel task={task} project={project} />

      {/*------ By Person ------*/}
      {time && time.logs.length > 0 && <TimeByPerson people={people} totals={timeByPerson({ logs: time.logs, now })} />}

      {/*------ Age and Columns ------*/}
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

      {/*------ Logs ------*/}
      <div className="flex flex-col gap-3">
        <h4 className="text-body-sm font-semibold">{m.time_logs()}</h4>
        {time && time.logs.length > 0 ? (
          <ul className="flex flex-col striped">
            {time.logs.toReversed().map((log) => (
              <TimeLogRow key={log.id} log={log} person={people.get(log.userId)} />
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">{m.time_logs_empty()}</p>
        )}
      </div>
    </section>
  );
}

/*===== By Person =====*/

/**
 * Who worked on the task and how much: a row per person with their cap, their name (beside a blinking LED while their
 * clock runs), their time as a running clock and their share of the whole. The meter is scaled to the one who worked
 * most, so the others read against them.
 */
function TimeByPerson({ people, totals }: { people: Map<string, Person>; totals: PersonTime[] }) {
  const all = totals.reduce((sum, person) => sum + person.seconds, 0);
  const most = Math.max(1, totals[0]?.seconds ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-body-sm font-semibold">{m.time_by_person()}</h4>
      <ul className="flex flex-col gap-4">
        {totals.map(({ userId, seconds, running }) => {
          const person = people.get(userId);
          const name = person?.name ?? "";
          const share = formatNumber(all > 0 ? seconds / all : 0, { style: "percent" });
          const clock = formatClock(seconds);
          return (
            <li key={userId} className="flex items-center gap-3">
              <PersonAvatar name={name} src={person?.avatarUrl} decorative />
              <Progress
                value={seconds}
                max={most}
                className="flex-1"
                getAriaValueText={() => m.time_person_meter_value({ duration: clock, share })}
              >
                <ProgressLabel>
                  {name}
                  {running && " "}
                  {running && <Led signal="positive" state="blink" size="sm" label={m.task_run_running()} />}
                </ProgressLabel>
                {/* Not announced as it ticks: the meter's value text says it when someone moves to it. */}
                <ProgressValue>{() => `${clock} · ${share}`}</ProgressValue>
              </Progress>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/*===== Log Row =====*/

/** One stretch of work: who, when, and how long. A typed-in entry (from before the timer was all) names its day. */
function TimeLogRow({ log, person }: { log: TimeLog; person: Person | undefined }) {
  // A typed-in entry names only its day; a timed one also says when it started.
  const date = formatDate(
    log.startedAt,
    log.manual ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <li className="flex items-center gap-4 py-2.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-sm font-semibold">{person?.name}</span>
        <span className="text-caption text-muted-foreground">
          {log.manual ? m.time_log_manual({ date }) : date}
          {log.note && ` · ${log.note}`}
        </span>
      </span>
      {log.endedAt ? (
        <Marking variant="code">
          {formatDuration(Math.round((log.endedAt.getTime() - log.startedAt.getTime()) / 60_000))}
        </Marking>
      ) : (
        <RunningLog since={log.startedAt} />
      )}
    </li>
  );
}

/** A log whose timer still runs: a blinking LED and its length so far. */
function RunningLog({ since }: { since: Date }) {
  const now = useNow();
  return (
    <span className="flex items-center gap-1.5">
      <Led signal="positive" state="blink" size="sm" label={m.task_run_running()} />
      <Marking variant="code">
        {now === null ? "" : formatDuration(Math.floor(secondsBetween(since, now) / 60))}
      </Marking>
    </span>
  );
}
