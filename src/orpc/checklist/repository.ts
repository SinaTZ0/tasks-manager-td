import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { checklistItem, task } from "#/db/schema";
import type { TaskRecord } from "#/orpc/task/repository";

/*===== Types =====*/
export type ChecklistItemRecord = typeof checklistItem.$inferSelect;
type NewChecklistItemRecord = typeof checklistItem.$inferInsert;

/*===== Reads =====*/
/** The tasks' checklist items, each list in order. */
export function findChecklistItems({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<ChecklistItemRecord[]> {
  if (taskIds.length === 0) return Promise.resolve([]);
  return db
    .select()
    .from(checklistItem)
    .where(inArray(checklistItem.taskId, taskIds))
    .orderBy(asc(checklistItem.taskId), asc(checklistItem.position));
}

/**
 * One item, locked until the transaction ends, with its task (unlocked: the history only quotes its code and title),
 * if it belongs to a live task of the project. An item of another project, or of an archived task, looks missing.
 */
export async function lockChecklistItem({
  db,
  projectId,
  id,
}: {
  db: Database;
  projectId: string;
  id: string;
}): Promise<{ item: ChecklistItemRecord; task: TaskRecord } | undefined> {
  const [row] = await db
    .select({ item: checklistItem, task })
    .from(checklistItem)
    .innerJoin(task, eq(task.id, checklistItem.taskId))
    .where(and(eq(checklistItem.id, id), eq(task.projectId, projectId)))
    .limit(1)
    .for("update", { of: checklistItem });
  return row && !row.task.archivedAt ? row : undefined;
}

/** The last key in a task's list, or null for an empty one, and how many items it has. */
export async function findListEnd({
  db,
  taskId,
}: {
  db: Database;
  taskId: string;
}): Promise<{ lastPosition: string | null; size: number }> {
  const [last] = await db
    .select({ position: checklistItem.position })
    .from(checklistItem)
    .where(eq(checklistItem.taskId, taskId))
    .orderBy(desc(checklistItem.position))
    .limit(1);
  const [total] = await db.select({ value: count() }).from(checklistItem).where(eq(checklistItem.taskId, taskId));
  return { lastPosition: last?.position ?? null, size: total?.value ?? 0 };
}

/** The keys of a task's other items, for resolving a move that lands on a taken key. */
export async function findOtherPositions({
  db,
  taskId,
  exceptId,
}: {
  db: Database;
  taskId: string;
  exceptId: string;
}): Promise<string[]> {
  const rows = await db
    .select({ position: checklistItem.position })
    .from(checklistItem)
    .where(and(eq(checklistItem.taskId, taskId), ne(checklistItem.id, exceptId)));
  return rows.map((row) => row.position);
}

/** Per task: how many items it has and how many are ticked, for the board's cards. */
export async function countChecklists({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, { done: number; total: number }>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({
      taskId: checklistItem.taskId,
      total: count(),
      done: count(checklistItem.doneAt),
    })
    .from(checklistItem)
    .where(inArray(checklistItem.taskId, taskIds))
    .groupBy(checklistItem.taskId);
  return new Map(rows.map((row) => [row.taskId, { done: row.done, total: row.total }]));
}

/*===== Writes =====*/
export async function insertChecklistItem({
  db,
  values,
}: {
  db: Database;
  values: NewChecklistItemRecord;
}): Promise<ChecklistItemRecord> {
  const [row] = await db.insert(checklistItem).values(values).returning();
  if (!row) throw new Error("insertChecklistItem: insert returned no row");
  return row;
}

export async function updateChecklistItem({
  db,
  id,
  values,
}: {
  db: Database;
  id: string;
  values: Partial<Pick<NewChecklistItemRecord, "text" | "position" | "doneAt" | "doneBy">>;
}): Promise<ChecklistItemRecord> {
  const [row] = await db.update(checklistItem).set(values).where(eq(checklistItem.id, id)).returning();
  if (!row) throw new Error("updateChecklistItem: update returned no row");
  return row;
}

export async function deleteChecklistItem({ db, id }: { db: Database; id: string }): Promise<void> {
  await db.delete(checklistItem).where(eq(checklistItem.id, id));
}
