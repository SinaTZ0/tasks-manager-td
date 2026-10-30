import { CheckIcon, PauseIcon, PlayIcon, RotateCcwIcon, SquareIcon, type LucideIcon } from "lucide-react";

import type { ColumnKind } from "#/orpc/project/constants";
import { canTakeAction, TASK_STATUS_ACTIONS, type TaskStatusAction } from "#/orpc/task/constants";
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
export function statusActionLabel({ action, kind }: { action: TaskStatusAction; kind: ColumnKind }): string {
  if (action === "start") return kind === "paused" ? m.task_action_resume() : m.task_action_start();
  return {
    pause: m.task_action_pause,
    done: m.task_action_done,
    stop: m.task_action_stop,
    reopen: m.task_action_reopen,
  }[action]();
}

export const statusActionIcon = (action: TaskStatusAction) => ACTION_ICONS[action];

/** The actions a task in a column of `kind` can take, in the order the keys show them. */
export function availableActions(kind: ColumnKind): TaskStatusAction[] {
  return TASK_STATUS_ACTIONS.filter((action) => canTakeAction({ action, kind }));
}

/** Pausing may give a reason and stopping must (rule 5): both ask for one first. */
export const asksReason = (action: TaskStatusAction): action is "pause" | "stop" =>
  action === "pause" || action === "stop";

/*===== Run State =====*/

/**
 * What a card's LED says about its work: running while anyone's timer runs on it, paused or done by its column. Other
 * columns show no LED: the column already says it all.
 */
export type RunState = "running" | "paused" | "done";

export function runStateOf({ kind, running }: { kind: ColumnKind | undefined; running: boolean }): RunState | null {
  if (running) return "running";
  if (kind === "paused") return "paused";
  if (kind === "done") return "done";
  return null;
}

export const RUN_STATE_LED = {
  running: { signal: "positive", state: "blink", label: m.task_run_running },
  paused: { signal: "attention", state: "on", label: m.task_run_paused },
  done: { signal: "positive", state: "on", label: m.task_run_done },
} as const satisfies Record<RunState, { signal: "positive" | "attention"; state: "blink" | "on"; label: () => string }>;
