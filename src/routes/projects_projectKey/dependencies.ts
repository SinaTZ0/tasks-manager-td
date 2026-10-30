import type { ColumnKind } from "#/orpc/project/constants";
import type { Project } from "#/orpc/project/contract";
import { BLOCKED_ENTRY_KINDS, RELEASED_KINDS } from "#/orpc/task/constants";
import type { TaskCard } from "#/orpc/task/contract";

/*===== Blocked Tasks =====*/
// The board works out which tasks are blocked from its own data, so a blocker dragged to done unlocks the tasks waiting
// for it at once, before the server answers. The server checks again on every move (rule 4).

/** Each column's kind, by column id. */
export const kindsOf = (project: Pick<Project, "columns">) =>
  new Map<string, ColumnKind>(project.columns.map((column) => [column.id, column.kind]));

/** Whether a task in a column of `kind` still holds up the tasks waiting for it. */
export const isHolding = (kind: ColumnKind | undefined) =>
  kind !== undefined && !(RELEASED_KINDS as readonly ColumnKind[]).includes(kind);

/** The tasks still holding `task` up: the ones it waits for that are on the board and not done or cancelled. */
export function blockersOf({
  task,
  tasks,
  kinds,
}: {
  task: Pick<TaskCard, "waitsFor">;
  tasks: Map<string, TaskCard>;
  kinds: Map<string, ColumnKind>;
}): TaskCard[] {
  return task.waitsFor.flatMap((id) => {
    const blocker = tasks.get(id);
    return blocker && isHolding(kinds.get(blocker.columnId)) ? [blocker] : [];
  });
}

/** Whether moving from a column of kind `from` to one of kind `to` is a move a blocked task needs forcing for. */
export const entersGuardedColumn = ({ from, to }: { from: ColumnKind | undefined; to: ColumnKind | undefined }) =>
  from !== to && to !== undefined && (BLOCKED_ENTRY_KINDS as readonly ColumnKind[]).includes(to);
