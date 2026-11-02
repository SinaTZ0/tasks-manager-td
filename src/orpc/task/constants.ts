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
 * What a person can do to a task's status besides dragging it (docs/app.md → Status / Cancel): done finishes it, stop
 * cancels it with a reason (its keys read "Cancel task"), reopen brings a done or cancelled task back to to do. Each
 * moves the card: the column kinds it may be taken from, and the kind it moves the task to.
 */
export const COLUMN_ACTION_RULES = {
  done: { from: ["todo", "doing", "custom"], to: "done" },
  stop: { from: ["todo", "doing", "custom", "done"], to: "cancelled" },
  reopen: { from: ["done", "cancelled"], to: "todo" },
} as const satisfies Record<string, { from: readonly ColumnKind[]; to: ColumnKind }>;

export const TASK_STATUS_ACTIONS = [
  "done",
  "stop",
  "reopen",
] as const satisfies readonly (keyof typeof COLUMN_ACTION_RULES)[];

export type TaskStatusAction = (typeof TASK_STATUS_ACTIONS)[number];

/** Whether `action` can be taken on a task in a column of `kind`. */
export function canTakeAction({ action, kind }: { action: TaskStatusAction; kind: ColumnKind }): boolean {
  return (COLUMN_ACTION_RULES[action].from as readonly ColumnKind[]).includes(kind);
}

/** Of a stop's reason. */
export const STATUS_REASON_MAX_LENGTH = 500;

/*===== Dependencies =====*/
/** The column kinds a blocked task can't enter unless the move is forced with a comment (rule 4). */
export const BLOCKED_ENTRY_KINDS = ["doing", "done"] as const satisfies readonly ColumnKind[];

/** The column kinds where a task stops holding up the tasks waiting for it. */
export const RELEASED_KINDS = ["done", "cancelled"] as const satisfies readonly ColumnKind[];

/** Of a comment's plain text. */
export const COMMENT_MAX_LENGTH = 10_000;

/** The code people use in chat: the project's key and the task's number (`TD-42`). */
export function taskCode({ key, number }: { key: string; number: number }): string {
  return `${key}-${number}`;
}
