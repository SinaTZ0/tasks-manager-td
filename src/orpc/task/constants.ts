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

/** The code people use in chat: the project's key and the task's number (`TD-42`). */
export function taskCode({ key, number }: { key: string; number: number }): string {
  return `${key}-${number}`;
}
