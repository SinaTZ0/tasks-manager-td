import { BanIcon, CheckIcon, PlayIcon, RotateCcwIcon, SquareIcon, type LucideIcon } from "lucide-react";

import type { ColumnKind } from "#/orpc/project/constants";
import { canTakeAction, TASK_STATUS_ACTIONS, type TaskStatusAction } from "#/orpc/task/constants";
import type { TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Status Actions =====*/
// How the card menu and the drawer's keys name and draw each status action. Message functions, called in render. The
// clock's stop draws the square, like the header's timer key; the task's stop draws a ban, so the two never look alike.

const ACTION_ICONS: Record<TaskStatusAction, LucideIcon> = {
  start: PlayIcon,
  pause: SquareIcon,
  done: CheckIcon,
  stop: BanIcon,
  reopen: RotateCcwIcon,
};

/** An action's name: the clock's two read "Start timer" and "Stop timer", like a chronometer's keys. */
export function statusActionLabel(action: TaskStatusAction): string {
  return {
    start: m.task_action_start,
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

/*===== Clock =====*/

/** Whether anyone's clock runs on the task: the card draws it as a green border and a blinking LED. */
export const isRunning = (task: Pick<TaskCard, "runningSince">) => task.runningSince.length > 0;
