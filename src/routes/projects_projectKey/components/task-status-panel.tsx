import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TimerOffIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Display, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { Progress, ProgressLabel, ProgressValue } from "#/components/primitive/progress/progress";
import { toast } from "#/components/primitive/toast/toast";
import { useNow } from "#/hooks/use-now";
import { describeApiFailure } from "#/lib/api-error";
import { columnTitle } from "#/lib/column-title";
import { formatClock, formatDuration, liveSeconds } from "#/lib/duration";
import { formatDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Person, Project } from "#/orpc/project/contract";
import { STATUS_ACTION_RULES, type TaskStatusAction } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ReasonDialog, type ReasonRequest } from "#/routes/projects_projectKey/components/reason-dialog";
import { entersGuardedColumn } from "#/routes/projects_projectKey/dependencies";
import {
  asksReason,
  availableActions,
  RUN_STATE_LED,
  runStateOf,
  statusActionIcon,
  statusActionLabel,
} from "#/routes/projects_projectKey/task-status";
import { useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

/*===== State Word =====*/

/** What the display prints for the task's state: its LED's word, or "stopped" or "idle" where no LED is lit. */
function stateWord({ kind, running }: { kind: ColumnKind; running: boolean }): string {
  const state = runStateOf({ kind, running });
  if (state) return RUN_STATE_LED[state].label();
  return kind === "cancelled" ? m.task_run_stopped() : m.task_run_idle();
}

/*===== Task Status Panel =====*/

/**
 * The drawer's transport: a display window with the task's state and its time spent, ticking while a timer runs; the
 * estimate meter under it; and keys for the status actions its column allows (docs/app.md → Status / Pause / Stop).
 * Start stops whatever else the viewer was timing (rule 2). While the viewer's own timer runs here, its key stops just
 * that timer instead and leaves the card in doing. A paused or stopped task prints who did it and why.
 */
export function TaskStatusPanel({
  task,
  project,
  code,
  people,
  blockers,
}: {
  task: TaskDetail;
  project: Project;
  code: string;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up: starting or finishing it asks why first (rule 4). */
  blockers: string[];
}) {
  const queryClient = useQueryClient();
  const transition = useTaskTransition(project);
  const { data: myTimer } = useQuery(orpc.time.current.queryOptions());
  // Kept after the dialog closes, so it can play its way out showing what it asked.
  const [asking, setAsking] = useState<{
    request: ReasonRequest;
    run: (reason: string) => void;
    open: boolean;
  } | null>(null);
  const now = useNow();

  const column = project.columns.find((item) => item.id === task.columnId);
  const kind: ColumnKind = column?.kind ?? "backlog";
  const running = task.runningSince.length > 0;
  const timingHere = myTimer?.taskId === task.id;
  const state = runStateOf({ kind, running });
  const seconds = liveSeconds({ ...task, now });

  const stopMine = useMutation(
    orpc.time.stop.mutationOptions({
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.time.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
        ]),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.timer_stop_failed() });
        toast.add({ title: failure.message ?? m.timer_stop_failed(), type: "error" });
      },
    }),
  );

  const take = (action: TaskStatusAction) => {
    if (asksReason(action)) {
      return setAsking({
        request: { kind: action, code },
        run: (reason) => transition({ taskId: task.id, action, reason }),
        open: true,
      });
    }
    if (blockers.length > 0 && entersGuardedColumn({ from: kind, to: STATUS_ACTION_RULES[action].to })) {
      return setAsking({
        request: { kind: "force", code, blockers },
        run: (forceComment) => transition({ taskId: task.id, action, forceComment }),
        open: true,
      });
    }
    transition({ taskId: task.id, action });
  };

  return (
    <section aria-label={m.task_status()} className="flex flex-col gap-4">
      {/*------ Display ------*/}
      <Display>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <Led
              signal={state ? RUN_STATE_LED[state].signal : "action"}
              state={state ? RUN_STATE_LED[state].state : "off"}
            />
            <DisplayLabel>{stateWord({ kind, running })}</DisplayLabel>
          </span>
          {/* Paused, done and stopped already name their column; the others print it. */}
          {column && !["paused", "done", "cancelled"].includes(kind) && (
            <DisplayLabel>{columnTitle(column)}</DisplayLabel>
          )}
        </div>
        <div className="flex items-end justify-between gap-4">
          <DisplayLabel>{m.time_spent_label()}</DisplayLabel>
          {/* Not announced as it ticks: the value is read when someone moves to it. */}
          <DisplayValue>{formatClock(seconds)}</DisplayValue>
        </div>
      </Display>

      {/*------ Estimate ------*/}
      {task.estimateMinutes !== null && (
        <EstimateMeter spentMinutes={Math.floor(seconds / 60)} estimateMinutes={task.estimateMinutes} />
      )}

      {/*------ Keys ------*/}
      <div className="flex flex-wrap gap-3">
        {availableActions(kind).map((action) => {
          if (action === "start" && timingHere) {
            return (
              <Button
                key="stop-mine"
                variant="secondary"
                size="sm"
                disabled={stopMine.isPending}
                onClick={() => stopMine.mutate(undefined)}
              >
                <TimerOffIcon data-icon="inline-start" />
                {m.timer_stop_mine()}
              </Button>
            );
          }
          const Icon = statusActionIcon(action);
          return (
            <Button
              key={action}
              variant={action === "start" || action === "reopen" ? "default" : "secondary"}
              size="sm"
              onClick={() => take(action)}
            >
              <Icon data-icon="inline-start" />
              {statusActionLabel({ action, kind })}
            </Button>
          );
        })}
      </div>

      {/*------ Why ------*/}
      {task.statusNote && <StatusNote note={task.statusNote} people={people} />}

      {asking && (
        <ReasonDialog
          request={asking.request}
          open={asking.open}
          onOpenChange={(open) => setAsking({ ...asking, open })}
          onConfirm={asking.run}
        />
      )}
    </section>
  );
}

/*===== Estimate Meter =====*/

/** Time spent against the estimate, as a level meter that lights orange past the plan. */
function EstimateMeter({ spentMinutes, estimateMinutes }: { spentMinutes: number; estimateMinutes: number }) {
  // Half again past the plan, so an overrun stays visible; further still once it runs past that.
  const max = Math.max(Math.round(estimateMinutes * 1.5), spentMinutes);

  return (
    <Progress
      value={spentMinutes}
      max={max}
      threshold={estimateMinutes}
      getAriaValueText={() => m.task_estimate_meter_value({ spent: spentMinutes, estimate: estimateMinutes })}
    >
      <ProgressLabel>{m.task_estimate_meter()}</ProgressLabel>
      <ProgressValue>{() => `${formatDuration(spentMinutes)} / ${formatDuration(estimateMinutes)}`}</ProgressValue>
    </Progress>
  );
}

/*===== Status Note =====*/

/** Who paused or stopped the task, when, and the reason they gave. */
function StatusNote({ note, people }: { note: NonNullable<TaskDetail["statusNote"]>; people: Map<string, Person> }) {
  const name = people.get(note.actorId)?.name ?? "";
  const date = formatDate(note.at, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-1 rounded-chassis border border-border px-4 py-3">
      <p className="text-body-sm text-muted-foreground">
        {note.action === "pause" ? m.task_paused_by({ name, date }) : m.task_stopped_by({ name, date })}
      </p>
      {note.reason && <p className="text-body whitespace-pre-line">{note.reason}</p>}
    </div>
  );
}
