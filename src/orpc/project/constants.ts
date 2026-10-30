/*===== Project Constants =====*/
// Browser-safe values shared by the API, the board and the project forms.

/**
 * The column kinds, in the order a new board shows them. Every project has exactly one column of each, and the app's
 * logic follows the kind, never the column's name (docs/app.md rule 8). `cancelled` is never drawn on the board.
 */
export const COLUMN_KINDS = ["backlog", "todo", "doing", "paused", "review", "done", "cancelled"] as const;

export type ColumnKind = (typeof COLUMN_KINDS)[number];

export const PROJECT_NAME_MAX_LENGTH = 60;

/** A key is the task-code prefix (`TD` in `TD-42`): Latin capitals, so codes read the same in every language. */
export const PROJECT_KEY_PATTERN = /^[A-Z]{2,5}$/;
export const PROJECT_KEY_MAX_LENGTH = 5;

export const COLUMN_NAME_MAX_LENGTH = 30;
export const WIP_LIMIT_MAX = 99;
