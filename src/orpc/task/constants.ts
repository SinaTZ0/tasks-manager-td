import type { ColumnKind } from "#/orpc/project/constants";

/*===== Task Constants =====*/
// Browser-safe values shared by the API, the board and the task forms.

/** From least to most pressing; the card prints them as one to four bars. */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Label colours: theme tokens (`--label-<name>` in `src/styles.css`), none of them a signal colour, so a label never
 * reads as a status.
 */
export const LABEL_COLORS = ["slate", "purple", "pink", "brown", "teal", "navy"] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export const TASK_TITLE_MAX_LENGTH = 200;
/** Of the description's plain text. */
export const TASK_DESCRIPTION_MAX_LENGTH = 20_000;
export const LABEL_NAME_MAX_LENGTH = 30;
/** 999 hours: anything longer is a project, not a task. */
export const ESTIMATE_MAX_MINUTES = 999 * 60;

/*===== Status Actions =====*/

/**
 * What a person can do to a task's status, each tied to a column kind (docs/app.md → Status / Pause / Stop): start (or
 * resume) puts it in doing and starts their timer, pause parks it in paused, done finishes it, stop cancels it with a
 * reason, reopen brings a done or cancelled task back to todo.
 */
export const TASK_STATUS_ACTIONS = ["start", "pause", "done", "stop", "reopen"] as const;

export type TaskStatusAction = (typeof TASK_STATUS_ACTIONS)[number];

/** The column kinds each action may be taken from, and the kind it moves the task to. */
export const STATUS_ACTION_RULES = {
  start: { from: ["backlog", "todo", "doing", "paused", "review"], to: "doing" },
  pause: { from: ["doing"], to: "paused" },
  done: { from: ["backlog", "todo", "doing", "paused", "review"], to: "done" },
  stop: { from: ["backlog", "todo", "doing", "paused", "review", "done"], to: "cancelled" },
  reopen: { from: ["done", "cancelled"], to: "todo" },
} as const satisfies Record<TaskStatusAction, { from: readonly ColumnKind[]; to: ColumnKind }>;

/** Whether `action` can be taken on a task in a column of `kind`. */
export function canTakeAction({ action, kind }: { action: TaskStatusAction; kind: ColumnKind }): boolean {
  return (STATUS_ACTION_RULES[action].from as readonly ColumnKind[]).includes(kind);
}

/** Of a pause's or a stop's reason. */
export const STATUS_REASON_MAX_LENGTH = 500;

/*===== Time =====*/
/** A manual entry is at most a day's work. */
export const TIME_ENTRY_MAX_MINUTES = 24 * 60;
export const TIME_NOTE_MAX_LENGTH = 200;

/** The code people use in chat: the project's key and the task's number (`TD-42`). */
export function taskCode({ key, number }: { key: string; number: number }): string {
  return `${key}-${number}`;
}
