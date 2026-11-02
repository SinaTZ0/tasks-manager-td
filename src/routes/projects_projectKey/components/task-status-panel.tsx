import { Display, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { Progress, ProgressLabel, ProgressValue } from "#/components/primitive/progress/progress";
import { useNow } from "#/hooks/use-now";
import { columnTitle } from "#/lib/column-title";
import { formatClock, formatDuration, liveSeconds } from "#/lib/duration";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Project } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { isRunning } from "#/routes/projects_projectKey/task-status";

/*===== State =====*/

type PanelState = { word: string; signal: "positive" | "attention" | "action"; led: "blink" | "on" | "off" };

/** What the display's LED and word say: the clock while it runs, else where the work stands (done, stopped, or idle). */
function stateOf({ task, kind }: { task: TaskDetail; kind: ColumnKind }): PanelState {
  if (isRunning(task)) return { word: m.task_run_running(), signal: "positive", led: "blink" };
  if (kind === "done") return { word: m.task_run_done(), signal: "positive", led: "on" };
  return { word: kind === "cancelled" ? m.task_run_stopped() : m.task_run_idle(), signal: "action", led: "off" };
}

/*===== Task Status Panel =====*/

/**
 * The clock's face, at the top of the drawer's time section: a display window with the task's state and its time
 * spent, ticking while a clock runs, and the estimate meter under it. The key that runs the viewer's clock starts the
 * status track in the drawer's header (`TaskWorkKey`), apart from the track's keys that finish, cancel and reopen the
 * task (`TaskStatusTrack`), so the two are never mistaken for each other.
 */
export function TaskStatusPanel({ task, project }: { task: TaskDetail; project: Project }) {
  const now = useNow();

  const column = project.columns.find((item) => item.id === task.columnId);
  const kind: ColumnKind = column?.kind ?? "todo";
  const state = stateOf({ task, kind });
  const seconds = liveSeconds({ ...task, now });

  return (
    <section aria-label={m.task_timer()} className="flex flex-col gap-4">
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
