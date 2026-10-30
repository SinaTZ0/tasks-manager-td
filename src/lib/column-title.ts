import type { ColumnKind } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== Column Titles =====*/

// Message functions, not their text, so each request gets its own locale.
const KIND_TITLES: Record<ColumnKind, () => string> = {
  backlog: m.board_column_backlog,
  todo: m.board_column_todo,
  doing: m.board_column_doing,
  paused: m.board_column_paused,
  review: m.board_column_review,
  done: m.board_column_done,
  cancelled: m.board_column_cancelled,
};

/** The kind's own name, in the reader's language. */
export function columnKindTitle(kind: ColumnKind): string {
  return KIND_TITLES[kind]();
}

/** What a column is called: the name an admin gave it, or else its kind's own name. */
export function columnTitle(column: { kind: ColumnKind; name: string | null }): string {
  return column.name ?? columnKindTitle(column.kind);
}
