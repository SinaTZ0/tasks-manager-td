import { BanIcon, CheckIcon, RotateCcwIcon, type LucideIcon } from "lucide-react";

import type { ColumnKind } from "#/orpc/project/constants";
import { canTakeAction, TASK_STATUS_ACTIONS, type TaskStatusAction } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Status Actions =====*/
// How the card menu and the drawer's keys name and draw each status action. Message functions, called in render.

const ACTION_ICONS: Record<TaskStatusAction, LucideIcon> = {
  done: CheckIcon,
  stop: BanIcon,
  reopen: RotateCcwIcon,
};

/** An action's name. */
export function statusActionLabel(action: TaskStatusAction): string {
  return {
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
