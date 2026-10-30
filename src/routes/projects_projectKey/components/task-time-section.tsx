import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "#/components/primitive/button/button";
import { DatePicker } from "#/components/primitive/date-picker/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { toast } from "#/components/primitive/toast/toast";
import { useNow } from "#/hooks/use-now";
import { describeApiFailure } from "#/lib/api-error";
import { columnTitle } from "#/lib/column-title";
import { formatDuration, parseDuration } from "#/lib/duration";
import { formatDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import type { Person, Project } from "#/orpc/project/contract";
import { TIME_ENTRY_MAX_MINUTES, TIME_NOTE_MAX_LENGTH } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import type { ColumnStay, TimeLog } from "#/orpc/time/contract";
import { m } from "#/paraglide/messages";
import { timeQuery } from "#/routes/projects_projectKey/queries";

/*===== Spans =====*/

/** A span of time as people read it: `h:mm` under a day, days and hours past that. */
function formatSpan(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  if (minutes < 24 * 60) return formatDuration(minutes);
  return m.time_span_days({ days: Math.floor(minutes / (24 * 60)), hours: Math.floor(minutes / 60) % 24 });
}

const secondsBetween = (start: Date, end: number) => Math.max(0, (end - start.getTime()) / 1000);

/** Seconds spent in each kind of column, open stays counted up to `now` (left out while the page hydrates). */
function timeByKind({ stays, now }: { stays: ColumnStay[]; now: number | null }) {
  const totals = new Map<ColumnStay["kind"], number>();
  for (const stay of stays) {
    const end = stay.leftAt?.getTime() ?? now;
    if (end === null) continue;
    totals.set(stay.kind, (totals.get(stay.kind) ?? 0) + secondsBetween(stay.enteredAt, end));
  }
  return COLUMN_KINDS.flatMap((kind) => {
    const seconds = totals.get(kind);
    return seconds === undefined ? [] : [{ kind, seconds }];
  });
}

/*===== Task Time Section =====*/

/**
 * The drawer's time: how old the task is (created to done, or to now), how long it has sat in each kind of column (from
 * its history), every stretch of work logged on it, and a form to log time worked without the timer. Each person can
 * remove their own typed-in entries; timed ones stay as the timer saw them.
 */
export function TaskTimeSection({
  task,
  project,
  people,
  viewerId,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  people: Map<string, Person>;
  viewerId: string;
  /** A viewer sees the time but logs none. */
  readOnly: boolean;
}) {
  const { data: time } = useQuery(timeQuery({ projectId: project.id, number: task.number }));
  const now = useNow();
  const ageEnd = task.completedAt?.getTime() ?? now;
  const archived = task.archivedAt !== null;

  return (
    <section aria-labelledby="task-time-title" className="flex flex-col gap-6">
      <h3 id="task-time-title" className="font-heading text-h4">
        {m.time_title()}
      </h3>

      {/*------ Age and Columns ------*/}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        <dt className="text-body-sm text-muted-foreground">{task.completedAt ? m.time_age_done() : m.time_age()}</dt>
        <dd>
          <Marking variant="code">{ageEnd === null ? "" : formatSpan(secondsBetween(task.createdAt, ageEnd))}</Marking>
        </dd>
        {time &&
          timeByKind({ stays: time.stays, now }).map(({ kind, seconds }) => {
            const column = project.columns.find((item) => item.kind === kind);
            return (
              <div key={kind} className="contents">
                <dt className="text-body-sm text-muted-foreground">
                  {m.time_in_column({ column: column ? columnTitle(column) : kind })}
                </dt>
                <dd>
                  <Marking variant="code">{formatSpan(seconds)}</Marking>
                </dd>
              </div>
            );
          })}
      </dl>

      {/*------ Logs ------*/}
      <div className="flex flex-col gap-3">
        <h4 className="text-body-sm font-semibold">{m.time_logs()}</h4>
        {time && time.logs.length > 0 ? (
          <ul className="flex flex-col striped">
            {time.logs.toReversed().map((log) => (
              <TimeLogRow
                key={log.id}
                log={log}
                projectId={project.id}
                person={people.get(log.userId)}
                canRemove={log.manual && log.userId === viewerId && !archived && !readOnly}
              />
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">{m.time_logs_empty()}</p>
        )}
      </div>

      {/*------ Manual Entry ------*/}
      {!archived && !readOnly && <TimeEntryForm projectId={project.id} taskId={task.id} />}
    </section>
  );
}

/*===== Log Row =====*/

/** Refetches what a change to a task's logs shows on: the drawer's time, its card's total, the drawer's total. */
function useTimeChanged() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.time.forTask.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
    ]);
}

function TimeLogRow({
  log,
  projectId,
  person,
  canRemove,
}: {
  log: TimeLog;
  projectId: string;
  person: Person | undefined;
  canRemove: boolean;
}) {
  const changed = useTimeChanged();
  // A typed-in entry names only its day; a timed one also says when it started.
  const date = formatDate(
    log.startedAt,
    log.manual ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" },
  );
  const remove = useMutation(
    orpc.time.remove.mutationOptions({
      onSettled: changed,
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.time_remove_failed() });
        toast.add({ title: failure.message ?? m.time_remove_failed(), type: "error" });
      },
    }),
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
      {canRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.time_remove({ date })}
          disabled={remove.isPending}
          onClick={() => remove.mutate({ projectId, logId: log.id })}
        >
          <Trash2Icon />
        </Button>
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

/*===== Manual Entry Form =====*/

/** "Worked 2h yesterday": the day, how long, and an optional note, logged as the viewer's. */
function TimeEntryForm({ projectId, taskId }: { projectId: string; taskId: string }) {
  const id = useId();
  const changed = useTimeChanged();
  const [date, setDate] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = useMutation(
    orpc.time.add.mutationOptions({
      onSuccess: () => {
        setDate(null);
        setDuration("");
        setNote("");
        setErrors({});
      },
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.time_add_failed() });
        setErrors(failure.fields);
        if (failure.message || Object.keys(failure.fields).length === 0) {
          toast.add({ title: failure.message ?? m.time_add_failed(), type: "error" });
        }
      },
      onSettled: changed,
    }),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const minutes = parseDuration(duration);
    const found: Record<string, string> = {};
    if (!date) found.date = m.time_error_date_invalid();
    if (!minutes || minutes < 1 || minutes > TIME_ENTRY_MAX_MINUTES) {
      found.minutes = m.time_error_minutes_invalid({ max: TIME_ENTRY_MAX_MINUTES / 60 });
    }
    setErrors(found);
    if (!date || !minutes || Object.keys(found).length > 0) return;
    add.mutate({ projectId, taskId, date, minutes, note: note.trim() || undefined });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-chassis border border-border p-4">
      <h4 className="text-body-sm font-semibold">{m.time_add_title()}</h4>
      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!errors.date || undefined}>
          <FieldLabel htmlFor={`${id}-date`}>{m.time_add_date()}</FieldLabel>
          <DatePicker id={`${id}-date`} value={date} onChange={setDate} aria-invalid={!!errors.date} />
          <FieldError>{errors.date}</FieldError>
        </Field>
        <Field data-invalid={!!errors.minutes || undefined}>
          <FieldLabel htmlFor={`${id}-minutes`}>{m.time_add_duration()}</FieldLabel>
          <Input
            id={`${id}-minutes`}
            variant="code"
            dir="ltr"
            inputMode="decimal"
            autoComplete="off"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            aria-invalid={!!errors.minutes}
            aria-describedby={`${id}-minutes-hint`}
          />
          <FieldDescription id={`${id}-minutes-hint`}>{m.task_estimate_hint()}</FieldDescription>
          <FieldError>{errors.minutes}</FieldError>
        </Field>
      </div>
      <Field data-invalid={!!errors.note || undefined}>
        <FieldLabel htmlFor={`${id}-note`}>{m.time_add_note()}</FieldLabel>
        <Input
          id={`${id}-note`}
          value={note}
          maxLength={TIME_NOTE_MAX_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={!!errors.note}
        />
        <FieldError>{errors.note}</FieldError>
      </Field>
      <Button type="submit" size="sm" className="self-start" disabled={add.isPending}>
        <PlusIcon data-icon="inline-start" />
        {m.time_add_submit()}
      </Button>
    </form>
  );
}
