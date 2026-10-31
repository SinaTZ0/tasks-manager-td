import type { Database } from "#/db/client.server";
import { findTaskActivities } from "#/orpc/activity/repository";
import { recordActivity } from "#/orpc/activity/service";
import { COLUMN_KINDS, type ColumnKind } from "#/orpc/project/constants";
import { taskCode } from "#/orpc/task/constants";
import { findProjectKey, findTaskByNumber } from "#/orpc/task/repository";
import type { ColumnStay, RunningTimer, TaskTime } from "#/orpc/time/contract";
import { toTimeLog } from "#/orpc/time/mapper";
import {
  closeOpenLogs,
  findRunningTimer,
  findTaskTimeLogs,
  insertTimeLog,
  lockTimerOwner,
} from "#/orpc/time/repository";

/*===== Types =====*/
/**
 * Why a clock stopped, as the history says it: its person stopped it from the header or on the task, they started
 * another (rule 2), its task was finished (done or stopped, rule 3), or it was archived.
 */
export type TimerStopCause = "stopped" | "paused" | "switched" | "finished" | "archived";

/** The task a timer is started on. */
type TimedTask = { id: string; projectId: string; number: number; title: string };

const secondsBetween = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / 1000);

/*===== Timers =====*/
/**
 * Stops the running clocks of one person or one task and records each in its task's history, like a chronometer: the
 * time so far stays logged, and the next start adds to it. Call it inside the transaction that causes it, so the change
 * and its effect on the clocks land together.
 */
export async function closeTimers({
  db,
  actorId,
  scope,
  cause,
  at = new Date(),
}: {
  db: Database;
  actorId: string;
  scope: { userId: string } | { taskId: string };
  cause: TimerStopCause;
  at?: Date;
}): Promise<void> {
  const closed = await closeOpenLogs({ db, scope, at });
  await recordActivity({
    db,
    actorId,
    entries: closed.map((log) => ({
      action: "time.stopped",
      projectId: log.projectId,
      taskId: log.taskId,
      after: {
        logId: log.id,
        userId: log.userId,
        seconds: secondsBetween(log.startedAt, at),
        cause,
      },
      snapshot: { code: taskCode({ key: log.key, number: log.number }), title: log.title },
    })),
  });
}

/**
 * Starts the actor's clock on a task, wherever its card sits. They have one running clock at most (rule 2): one on
 * another task stops first, in the same transaction; one already on this task keeps running.
 */
export async function startTimer({ db, actorId, task }: { db: Database; actorId: string; task: TimedTask }) {
  await lockTimerOwner({ db, userId: actorId });
  const running = await findRunningTimer({ db, userId: actorId });
  if (running?.taskId === task.id) return;
  if (running) await closeTimers({ db, actorId, scope: { userId: actorId }, cause: "switched" });

  const log = await insertTimeLog({ db, values: { taskId: task.id, userId: actorId, startedAt: new Date() } });
  await recordActivity({
    db,
    actorId,
    entries: [
      {
        action: "time.started",
        projectId: task.projectId,
        taskId: task.id,
        after: { logId: log.id, userId: actorId },
        snapshot: {
          code: taskCode({ key: await findProjectKey({ db, projectId: task.projectId }), number: task.number }),
          title: task.title,
        },
      },
    ],
  });
}

/** The viewer's running timer, or null. */
export async function getRunningTimer({ db, userId }: { db: Database; userId: string }): Promise<RunningTimer | null> {
  return (await findRunningTimer({ db, userId })) ?? null;
}

/** Stops the viewer's running timer, if one runs. The task stays where it is. */
export async function stopRunningTimer({ db, actorId }: { db: Database; actorId: string }): Promise<void> {
  await db.transaction(async (tx) => {
    await lockTimerOwner({ db: tx, userId: actorId });
    await closeTimers({ db: tx, actorId, scope: { userId: actorId }, cause: "stopped" });
  });
}

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

/** A task's logs and the columns it has been in, for its drawer. */
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
  const logs = await findTaskTimeLogs({ db, taskId: task.id });
  const entries = await findTaskActivities({ db, taskId: task.id, actions: COLUMN_ENTRIES });
  return { logs: logs.map(toTimeLog), stays: columnStays(entries) };
}
