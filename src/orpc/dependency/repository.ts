import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { task, taskDependency } from "#/db/schema";

/*===== Types =====*/
/** A task as a dependency names it: enough to print its code and title. */
export type LinkedTask = { id: string; number: number; title: string; ownerId: string };

/** The column kinds where a task no longer holds up the tasks waiting for it. */
const RELEASED_KINDS = sql`('done', 'cancelled')`;

/*===== Reads =====*/
/** What each task waits for, as `taskId → blockerIds`, leaving out archived blockers. */
export async function findWaitsFor({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const rows = await db
    .select({ taskId: taskDependency.taskId, blockerId: taskDependency.blockerId })
    .from(taskDependency)
    .innerJoin(task, eq(task.id, taskDependency.blockerId))
    .where(and(inArray(taskDependency.taskId, taskIds), isNull(task.archivedAt)));
  for (const row of rows) byTask.set(row.taskId, [...(byTask.get(row.taskId) ?? []), row.blockerId]);
  return byTask;
}

/** The tasks still holding a task up: live, and not done or cancelled. */
export async function findBlockingTasks({ db, taskId }: { db: Database; taskId: string }): Promise<LinkedTask[]> {
  const result = await db.execute<{ id: string; number: number; title: string; owner_id: string }>(sql`
    select b.id, b.number, b.title, b.owner_id
    from task_dependency d
    join task b on b.id = d.blocker_id
    join board_column c on c.id = b.column_id
    where d.task_id = ${taskId} and b.archived_at is null and c.kind not in ${RELEASED_KINDS}
    order by b.number
  `);
  return result.rows.map((row) => ({ id: row.id, number: row.number, title: row.title, ownerId: row.owner_id }));
}

/**
 * The live tasks waiting for `blockerId` that nothing else holds up: the ones it releases when it is done, cancelled or
 * archived. Asked before the blocker moves, so it is left out of the check.
 */
export async function findReleasedDependents({
  db,
  blockerId,
}: {
  db: Database;
  blockerId: string;
}): Promise<LinkedTask[]> {
  const result = await db.execute<{ id: string; number: number; title: string; owner_id: string }>(sql`
    select t.id, t.number, t.title, t.owner_id
    from task_dependency d
    join task t on t.id = d.task_id
    where d.blocker_id = ${blockerId} and t.archived_at is null
      and not exists (
        select 1
        from task_dependency other
        join task b on b.id = other.blocker_id
        join board_column c on c.id = b.column_id
        where other.task_id = d.task_id and other.blocker_id <> ${blockerId}
          and b.archived_at is null and c.kind not in ${RELEASED_KINDS}
      )
  `);
  return result.rows.map((row) => ({ id: row.id, number: row.number, title: row.title, ownerId: row.owner_id }));
}

/**
 * Whether `blockerId` already waits for `taskId`, directly or through other tasks: then "`taskId` waits for
 * `blockerId`" would close a loop.
 */
export async function wouldCycle({
  db,
  taskId,
  blockerId,
}: {
  db: Database;
  taskId: string;
  blockerId: string;
}): Promise<boolean> {
  const result = await db.execute(sql`
    with recursive chain(id) as (
      select blocker_id from task_dependency where task_id = ${blockerId}
      union
      select d.blocker_id from task_dependency d join chain on d.task_id = chain.id
    )
    select 1 from chain where id = ${taskId} limit 1
  `);
  return result.rows.length > 0;
}

/*===== Writes =====*/
/** Adds the link; one that exists already is left alone. @returns Whether it was added. */
export async function insertDependency({
  db,
  values,
}: {
  db: Database;
  values: typeof taskDependency.$inferInsert;
}): Promise<boolean> {
  const rows = await db.insert(taskDependency).values(values).onConflictDoNothing().returning();
  return rows.length > 0;
}

/** @returns Whether there was a link to remove. */
export async function deleteDependency({
  db,
  taskId,
  blockerId,
}: {
  db: Database;
  taskId: string;
  blockerId: string;
}): Promise<boolean> {
  const rows = await db
    .delete(taskDependency)
    .where(and(eq(taskDependency.taskId, taskId), eq(taskDependency.blockerId, blockerId)))
    .returning();
  return rows.length > 0;
}
