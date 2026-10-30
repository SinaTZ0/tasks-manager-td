import { ToggleGroup, ToggleGroupItem } from "#/components/primitive/toggle-group/toggle-group";
import { columnTitle } from "#/lib/column-title";
import type { Column } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";

/*===== Board Column Toggles =====*/

/**
 * One latch key per column, lit while the column is on the board; pressing it hides or shows that column. The hidden
 * ones are written to the URL (`onChange`, `?hide=`) like the filters, so the server renders the board without them.
 * The last column shown can't be hidden: an empty board would look broken. The cancelled column keeps its own switch.
 */
export function BoardColumnToggles({
  columns,
  hidden,
  onChange,
}: {
  /** The board's columns in order, without the cancelled one. */
  columns: Column[];
  hidden: ReadonlySet<string>;
  /** The ids of the columns to hide, none of them the cancelled one. */
  onChange: (hidden: string[]) => void;
}) {
  const shown = columns.filter((column) => !hidden.has(column.id)).map((column) => column.id);

  return (
    <ToggleGroup
      multiple
      aria-label={m.board_columns_shown()}
      size="sm"
      value={shown}
      onValueChange={(next) => {
        if (next.length === 0) return;
        onChange(columns.filter((column) => !next.includes(column.id)).map((column) => column.id));
      }}
    >
      {columns.map((column) => (
        <ToggleGroupItem key={column.id} value={column.id}>
          {columnTitle(column)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
