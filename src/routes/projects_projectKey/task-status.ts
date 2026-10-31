import { CheckIcon, PauseIcon, PlayIcon, RotateCcwIcon, SquareIcon, type LucideIcon } from "lucide-react";

import type { ColumnKind } from "#/orpc/project/constants";
import { canTakeAction, TASK_STATUS_ACTIONS, type TaskStatusAction } from "#/orpc/task/constants";
import type { TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Status Actions =====*/
// How the card menu and the drawer's keys name and draw each status action. Message functions, called in render.

const ACTION_ICONS: Record<TaskStatusAction, LucideIcon> = {
  start: PlayIcon,
  pause: PauseIcon,
  done: CheckIcon,
  stop: SquareIcon,
  reopen: RotateCcwIcon,
};

/** An action's name: start reads "resume" on a paused task. */
export function statusActionLabel({ action, paused }: { action: TaskStatusAction; paused: boolean }): string {
  if (action === "start") return paused ? m.task_action_resume() : m.task_action_start();
  return {
    pause: m.task_action_pause,
    done: m.task_action_done,
    stop: m.task_action_stop,
    reopen: m.task_action_reopen,
  }[action]();
}

export const statusActionIcon = (action: TaskStatusAction) => ACTION_ICONS[action];

/**
 * The actions a task in a column of `kind` can take, in the order the keys show them. `timing` says whether the
 * viewer's own clock runs on it: then it pauses, otherwise it starts.
 */
export function availableActions({ kind, timing }: { kind: ColumnKind; timing: boolean }): TaskStatusAction[] {
  return TASK_STATUS_ACTIONS.filter((action) => canTakeAction({ action, kind, timing }));
}

/** Pausing may give a reason and stopping must (rule 5): both ask for one first. */
export const asksReason = (action: TaskStatusAction): action is "pause" | "stop" =>
  action === "pause" || action === "stop";

/*===== Clock State =====*/

/**
 * What a task's clock says, apart from its column: running while anyone's clock runs on it, paused once the last one
 * stopped while the work goes on, idle otherwise. The card draws it as its border, green or yellow.
 */
export type ClockState = "running" | "paused" | "idle";

export function clockStateOf(task: Pick<TaskCard, "runningSince" | "pausedAt">): ClockState {
  if (task.runningSince.length > 0) return "running";
  if (task.pausedAt) return "paused";
  return "idle";
}

export const CLOCK_STATE_LED = {
  running: { signal: "positive", state: "blink", label: m.task_run_running },
  paused: { signal: "attention", state: "on", label: m.task_run_paused },
} as const satisfies Record<
  Exclude<ClockState, "idle">,
  { signal: "positive" | "attention"; state: "blink" | "on"; label: () => string }
>;
