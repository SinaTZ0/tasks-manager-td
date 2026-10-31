import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Display, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { Progress, ProgressLabel, ProgressValue } from "#/components/primitive/progress/progress";
import { useNow } from "#/hooks/use-now";
import { columnTitle } from "#/lib/column-title";
import { formatClock, formatDuration, liveSeconds } from "#/lib/duration";
import { formatDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import { isBackwardMove, type ColumnKind } from "#/orpc/project/constants";
import type { Person, Project } from "#/orpc/project/contract";
import { COLUMN_ACTION_RULES, isColumnAction, type TaskStatusAction } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ConfirmDialog, type ConfirmRequest } from "#/routes/projects_projectKey/components/confirm-dialog";
import { ReasonDialog, type ReasonRequest } from "#/routes/projects_projectKey/components/reason-dialog";
import { entersGuardedColumn } from "#/routes/projects_projectKey/dependencies";
import {
  asksReason,
  availableActions,
  CLOCK_STATE_LED,
  clockStateOf,
  statusActionIcon,
  statusActionLabel,
} from "#/routes/projects_projectKey/task-status";
import { useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

/*===== State =====*/

type PanelState = { word: string; signal: "positive" | "attention" | "action"; led: "blink" | "on" | "off" };

/**
 * What the display's LED and word say: the clock while it runs or is paused, else where the work stands (done,
 * stopped, or not running).
 */
function stateOf({ task, kind }: { task: TaskDetail; kind: ColumnKind }): PanelState {
  const clock = clockStateOf(task);
  if (clock !== "idle") {
    const led = CLOCK_STATE_LED[clock];
    return { word: led.label(), signal: led.signal, led: led.state };
  }
  if (kind === "done") return { word: m.task_run_done(), signal: "positive", led: "on" };
  return { word: kind === "cancelled" ? m.task_run_stopped() : m.task_run_idle(), signal: "action", led: "off" };
}

/*===== Task Status Panel =====*/

/**
 * The drawer's transport: a display window with the task's state and its time spent, ticking while a clock runs; the
 * estimate meter under it; and keys for the status actions it allows (docs/app.md → Status / Clock / Stop). Start runs
 * the viewer's own clock (stopping whatever else they were timing, rule 2) and pause stops it; neither moves the card.
 * A paused or stopped task prints who did it and why. Pause and stop ask for their reason first; reopening a done task
 * (a step back along the fixed columns) and starting the clock on one ask to confirm.
 */
export function TaskStatusPanel({
  task,
  project,
  code,
  people,
  blockers,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  code: string;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up: finishing it asks why first (rule 4). */
  blockers: string[];
  /** A viewer sees the display and meter, with no keys. */
  readOnly: boolean;
}) {
  const transition = useTaskTransition(project);
  const { data: myTimer } = useQuery(orpc.time.current.queryOptions());
  // Kept after the dialog closes, so it can play its way out showing what it asked.
  const [asking, setAsking] = useState<{
    request: ReasonRequest;
    run: (reason: string) => void;
    open: boolean;
  } | null>(null);
  // Kept after closing for the same reason.
  const [confirming, setConfirming] = useState<{ request: ConfirmRequest; run: () => void; open: boolean } | null>(
    null,
  );
  const now = useNow();

  const column = project.columns.find((item) => item.id === task.columnId);
  const kind: ColumnKind = column?.kind ?? "todo";
  const timing = myTimer?.taskId === task.id;
  const paused = task.pausedAt !== null;
  const state = stateOf({ task, kind });
  const seconds = liveSeconds({ ...task, now });

  const take = (action: TaskStatusAction) => {
    if (asksReason(action)) {
      return setAsking({
        request: { kind: action, code },
        run: (reason) => transition({ taskId: task.id, action, reason }),
        open: true,
      });
    }
    if (!isColumnAction(action)) {
      if (kind !== "done") return transition({ taskId: task.id, action });
      const request = {
        title: m.task_start_done_title({ code }),
        description: m.task_start_done_description(),
        confirm: statusActionLabel({ action, paused }),
      };
      return setConfirming({ request, run: () => transition({ taskId: task.id, action }), open: true });
    }

    const to = COLUMN_ACTION_RULES[action].to;
    const ahead = () => {
      if (blockers.length > 0 && entersGuardedColumn({ from: kind, to })) {
        return setAsking({
          request: { kind: "force", code, blockers },
          run: (forceComment) => transition({ taskId: task.id, action, forceComment }),
          open: true,
        });
      }
      transition({ taskId: task.id, action });
    };
    const target = project.columns.find((item) => item.kind === to);
    if (column && target && isBackwardMove({ from: kind, to })) {
      const request = {
        title: m.task_back_title({ code }),
        description: m.task_move_description({ from: columnTitle(column), to: columnTitle(target) }),
        confirm: statusActionLabel({ action, paused }),
      };
      return setConfirming({ request, run: ahead, open: true });
    }
    ahead();
  };

  return (
    <section aria-label={m.task_status()} className="flex flex-col gap-4">
      {/*------ Display ------*/}
      <Display>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <Led signal={state.signal} state={state.led} />
            <DisplayLabel>{state.word}</DisplayLabel>
          </span>
          {/* Done and stopped already name their column; the others print it. */}
          {column && kind !== "done" && kind !== "cancelled" && <DisplayLabel>{columnTitle(column)}</DisplayLabel>}
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
      {!readOnly && (
        <div className="flex flex-wrap gap-3">
          {availableActions({ kind, timing }).map((action) => {
            const Icon = statusActionIcon(action);
            return (
              <Button
                key={action}
                variant={action === "start" || action === "reopen" ? "default" : "secondary"}
                size="sm"
                onClick={() => take(action)}
              >
                <Icon data-icon="inline-start" />
                {statusActionLabel({ action, paused })}
              </Button>
            );
          })}
        </div>
      )}

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
      {confirming && (
        <ConfirmDialog
          request={confirming.request}
          open={confirming.open}
          onOpenChange={(open) => setConfirming({ ...confirming, open })}
          onConfirm={confirming.run}
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
