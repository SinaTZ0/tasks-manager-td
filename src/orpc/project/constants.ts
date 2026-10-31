/*===== Project Constants =====*/
// Browser-safe values shared by the API, the board and the project forms.

/**
 * The column kinds. Every project has one column of each fixed kind (to do, doing, done, in that order, which never
 * changes) and one cancelled column, which is never drawn on the board; an admin adds and removes `custom` columns
 * anywhere around them. The app's logic follows the kind, never the column's name (docs/app.md rule 8); a custom
 * column carries no logic of its own.
 */
export const COLUMN_KINDS = ["todo", "doing", "done", "cancelled", "custom"] as const;

export type ColumnKind = (typeof COLUMN_KINDS)[number];

/** The board's fixed columns, in their fixed order. */
export const FIXED_COLUMN_KINDS = ["todo", "doing", "done"] as const satisfies readonly ColumnKind[];

/** The kinds a project has exactly one of, created with it and never removed. */
export const SYSTEM_COLUMN_KINDS = [...FIXED_COLUMN_KINDS, "cancelled"] as const satisfies readonly ColumnKind[];

const fixedRank = (kind: ColumnKind | undefined) =>
  FIXED_COLUMN_KINDS.indexOf(kind as (typeof FIXED_COLUMN_KINDS)[number]);

/**
 * Whether a card moving from a column of kind `from` to one of kind `to` goes back along the fixed columns (done to
 * doing or to do, doing to to do). The board asks before such a move; custom columns never ask.
 */
export function isBackwardMove({ from, to }: { from: ColumnKind | undefined; to: ColumnKind | undefined }): boolean {
  const start = fixedRank(from);
  const end = fixedRank(to);
  return start !== -1 && end !== -1 && end < start;
}

export const PROJECT_NAME_MAX_LENGTH = 60;

/** A key is the task-code prefix (`TD` in `TD-42`): Latin capitals, so codes read the same in every language. */
export const PROJECT_KEY_PATTERN = /^[A-Z]{2,5}$/;
export const PROJECT_KEY_MAX_LENGTH = 5;

export const COLUMN_NAME_MAX_LENGTH = 30;
export const WIP_LIMIT_MAX = 99;
