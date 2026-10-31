import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { project, task, timeLog, user } from "#/db/schema";

/*===== Types =====*/
export type TimeLogRecord = typeof timeLog.$inferSelect;
type NewTimeLogRecord = typeof timeLog.$inferInsert;

/** A log that was just closed, with what the history needs to name its task. */
export type ClosedLog = TimeLogRecord & { projectId: string; key: string; number: number; title: string };

/** A task's time: the closed logs' total, and when each of its running timers started. */
export type TimeTotals = { spentSeconds: number; runningSince: Date[] };

/*===== Locks =====*/
/**
 * Locks a person's row until the transaction ends, so their timer changes take turns: two starts at once would
 * otherwise both find no running timer, and the second would hit the one-open-log index.
 */
export async function lockTimerOwner({ db, userId }: { db: Database; userId: string }): Promise<void> {
  await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
}

/*===== Running Timers =====*/
/**
 * Closes the running timers of one person (`scope.userId`) or of one task (`scope.taskId`), at `at`.
 *
 * @returns The logs it closed, with their tasks' codes and titles.
 */
export async function closeOpenLogs({
  db,
  scope,
  at,
}: {
  db: Database;
  scope: { userId: string } | { taskId: string };
  at: Date;
}): Promise<ClosedLog[]> {
  const owner = "userId" in scope ? eq(timeLog.userId, scope.userId) : eq(timeLog.taskId, scope.taskId);
  const closed = await db
    .update(timeLog)
    .set({ endedAt: at })
    .where(and(isNull(timeLog.endedAt), owner))
    .returning();
  if (closed.length === 0) return [];

  const tasks = await db
    .select({ id: task.id, projectId: task.projectId, key: project.key, number: task.number, title: task.title })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(
      inArray(
        task.id,
        closed.map((log) => log.taskId),
      ),
    );
  const byId = new Map(tasks.map((row) => [row.id, row]));
  return closed.flatMap((log) => {
    const logTask = byId.get(log.taskId);
    return logTask ? [{ ...log, ...logTask, id: log.id }] : [];
  });
}

/** The person's running timer, with the task and project it runs on, or nothing. */
export async function findRunningTimer({ db, userId }: { db: Database; userId: string }) {
  const [row] = await db
    .select({
      logId: timeLog.id,
      taskId: task.id,
      startedAt: timeLog.startedAt,
      projectKey: project.key,
      number: task.number,
      title: task.title,
    })
    .from(timeLog)
    .innerJoin(task, eq(task.id, timeLog.taskId))
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(eq(timeLog.userId, userId), isNull(timeLog.endedAt)))
    .limit(1);
  return row;
}

/*===== Logs =====*/
export async function insertTimeLog({
  db,
  values,
}: {
  db: Database;
  values: NewTimeLogRecord;
}): Promise<TimeLogRecord> {
  const [row] = await db.insert(timeLog).values(values).returning();
  if (!row) throw new Error("insertTimeLog: insert returned no row");
  return row;
}

/** A task's logs, oldest first. */
export function findTaskTimeLogs({ db, taskId }: { db: Database; taskId: string }): Promise<TimeLogRecord[]> {
  return db.select().from(timeLog).where(eq(timeLog.taskId, taskId)).orderBy(asc(timeLog.startedAt));
}

/*===== Totals =====*/
/** Each task's time, as `taskId → totals`. A task with no logs has no entry. */
export async function findTimeTotals({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, TimeTotals>> {
  const totals = new Map<string, TimeTotals>();
  if (taskIds.length === 0) return totals;
  const entry = (taskId: string) => {
    let value = totals.get(taskId);
    if (!value) {
      value = { spentSeconds: 0, runningSince: [] };
      totals.set(taskId, value);
    }
    return value;
  };

  // One after the other, so it can run inside a transaction's single connection.
  const closed = await db
    .select({
      taskId: timeLog.taskId,
      seconds: sql<string>`sum(extract(epoch from ${timeLog.endedAt} - ${timeLog.startedAt}))`,
    })
    .from(timeLog)
    .where(and(inArray(timeLog.taskId, taskIds), isNotNull(timeLog.endedAt)))
    .groupBy(timeLog.taskId);
  const running = await db
    .select({ taskId: timeLog.taskId, startedAt: timeLog.startedAt })
    .from(timeLog)
    .where(and(inArray(timeLog.taskId, taskIds), isNull(timeLog.endedAt)));
  for (const row of closed) entry(row.taskId).spentSeconds = Math.round(Number(row.seconds));
  for (const row of running) entry(row.taskId).runningSince.push(row.startedAt);
  return totals;
}
