import type { ColumnKind } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";

/*===== Column Titles =====*/

// Message functions, not their text, so each request gets its own locale.
const KIND_TITLES: Record<ColumnKind, () => string> = {
  todo: m.board_column_todo,
  doing: m.board_column_doing,
  done: m.board_column_done,
  cancelled: m.board_column_cancelled,
  // A custom column always has a name; this only shows if it somehow didn't.
  custom: m.board_column_custom,
};

/** The kind's own name, in the reader's language. */
export function columnKindTitle(kind: ColumnKind): string {
  return KIND_TITLES[kind]();
}

/** What a column is called: the name an admin gave it, or else its kind's own name. */
export function columnTitle(column: { kind: ColumnKind; name: string | null }): string {
  return column.name ?? columnKindTitle(column.kind);
}
