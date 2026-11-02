import type { Database } from "#/db/client.server";
import { findTaskActivities } from "#/orpc/activity/repository";
import { COLUMN_KINDS, type ColumnKind } from "#/orpc/project/constants";
import { findTaskByNumber } from "#/orpc/task/repository";
import type { ColumnStay, TaskTime } from "#/orpc/time/contract";

/*===== Task Time =====*/
/** The history entries that put a task in a column. */
const COLUMN_ENTRIES = [
  "task.created",
  "task.moved",
  "task.completed",
  "task.stopped",
  "task.reopened",
  "task.transferred",
  "task.copied",
] as const;

const asKind = (value: unknown): ColumnKind | undefined => COLUMN_KINDS.find((kind) => kind === value);

const textOf = (value: unknown) => (typeof value === "string" ? value : null);

/**
 * Where a task has been, from its history (docs/task-manager-plan.md → Time per column comes from Activity): each
 * entry that put it in a column ends the stay before it. A stay is per column, and keeps the column's kind and its name
 * then, so a column removed since still reads.
 */
function columnStays(entries: { action: string; after: unknown; snapshot: unknown; createdAt: Date }[]): ColumnStay[] {
  const stays: ColumnStay[] = [];
  for (const entry of entries) {
    // A new task's column is on its snapshot.
    const fields = (entry.action === "task.created" ? entry.snapshot : entry.after) ?? {};
    const place = fields as Record<string, unknown>;
    const kind = asKind(place.columnKind);
    const columnId = textOf(place.columnId);
    const current = stays.at(-1);
    if (!kind || !columnId || current?.columnId === columnId) continue;
    if (current) current.leftAt = entry.createdAt;
    stays.push({ columnId, kind, name: textOf(place.columnName), enteredAt: entry.createdAt, leftAt: null });
  }
  return stays;
}

/** The columns a task has been in, for its drawer. */
export async function getTaskTime({
  db,
  projectId,
  number,
}: {
  db: Database;
  projectId: string;
  number: number;
}): Promise<TaskTime | null> {
  const task = await findTaskByNumber({ db, projectId, number });
  if (!task) return null;
  const entries = await findTaskActivities({ db, taskId: task.id, actions: COLUMN_ENTRIES });
  return { stays: columnStays(entries) };
}
