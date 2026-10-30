import { z } from "zod";

import type { Database } from "#/db/client.server";
import { issuesToErrorData } from "#/lib/schema-issues";
import { findTaskActivities } from "#/orpc/activity/repository";
import { recordActivity } from "#/orpc/activity/service";
import { COLUMN_KINDS, type ColumnKind } from "#/orpc/project/constants";
import { taskCode } from "#/orpc/task/constants";
import { findProjectKey, findTaskByNumber, lockTask } from "#/orpc/task/repository";
import type { ColumnStay, RunningTimer, TaskTime, TimeLog } from "#/orpc/time/contract";
import { toTimeLog } from "#/orpc/time/mapper";
import {
  closeOpenLogs,
  deleteTimeLog,
  findProjectTimeLog,
  findRunningTimer,
  findTaskTimeLogs,
  insertTimeLog,
  lockTimerOwner,
} from "#/orpc/time/repository";
import { timeEntrySchema } from "#/orpc/time/validation";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string> };
type NotFound = { kind: "not-found" };

/**
 * Why a timer stopped, as the history says it: its person stopped it, they started another (rule 2), its task left
 * the doing column (rule 3), or the task was archived.
 */
export type TimerStopCause = "stopped" | "switched" | "left-doing" | "archived";

/** The task a timer is started on. */
type TimedTask = { id: string; projectId: string; number: number; title: string };

const isUuid = (value: string) => z.guid().safeParse(value).success;

const secondsBetween = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / 1000);

/*===== Timers =====*/
/**
 * Stops the running timers of one person or one task and records each in its task's history. Call it inside the
 * transaction that causes it, so the change and its effect on the timers land together.
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
      after: { logId: log.id, userId: log.userId, seconds: secondsBetween(log.startedAt, at), cause },
      snapshot: { code: taskCode({ key: log.key, number: log.number }), title: log.title },
    })),
  });
}

/**
 * Starts the actor's timer on a task. They have one running timer at most (rule 2): one on another task stops first, in
 * the same transaction; one already on this task keeps running. The caller has put the task in the doing column.
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
  "task.started",
  "task.paused",
  "task.completed",
  "task.stopped",
  "task.reopened",
] as const;

const asKind = (value: unknown): ColumnKind | undefined => COLUMN_KINDS.find((kind) => kind === value);

/**
 * Where a task has been, from its history (docs/task-manager-plan.md → Time per column comes from Activity): each
 * entry that put it in a column ends the stay before it. A stay is per kind of column, since the kind is what lasts
 * when a column is renamed.
 */
function columnStays(entries: { action: string; after: unknown; snapshot: unknown; createdAt: Date }[]): ColumnStay[] {
  const stays: ColumnStay[] = [];
  for (const entry of entries) {
    const after = (entry.after ?? {}) as Record<string, unknown>;
    const snapshot = (entry.snapshot ?? {}) as Record<string, unknown>;
    const kind =
      asKind(after.columnKind) ?? (entry.action === "task.created" ? asKind(snapshot.columnKind) : undefined);
    const current = stays.at(-1);
    if (!kind || current?.kind === kind) continue;
    if (current) current.leftAt = entry.createdAt;
    stays.push({ kind, enteredAt: entry.createdAt, leftAt: null });
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

/*===== Manual Entries =====*/
type AddResult = { kind: "success"; log: TimeLog } | Invalid | NotFound;

/**
 * Records time the actor worked without the timer ("worked 2h yesterday"). It starts at noon UTC of the day named, so
 * it reads as that day everywhere. Any live task takes one, done or cancelled ones too: the work happened.
 *
 * @returns `not-found` for a task the project doesn't have or one that is archived; `invalid` with field messages.
 */
export async function addTimeEntry({
  db,
  actorId,
  projectId,
  input,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  input: unknown;
}): Promise<AddResult> {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { taskId, date, minutes, note } = parsed.data;
  if (!isUuid(taskId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<AddResult> => {
    const task = await lockTask({ db: tx, projectId, id: taskId });
    if (!task || task.archivedAt) return { kind: "not-found" };

    const startedAt = new Date(`${date}T12:00:00Z`);
    const endedAt = new Date(startedAt.getTime() + minutes * 60_000);
    const log = await insertTimeLog({
      db: tx,
      values: { taskId, userId: actorId, startedAt, endedAt, manual: true, note },
    });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "time.added",
          projectId,
          taskId,
          after: { logId: log.id, date, minutes, note },
          snapshot: {
            code: taskCode({ key: await findProjectKey({ db: tx, projectId }), number: task.number }),
            title: task.title,
          },
        },
      ],
    });
    return { kind: "success", log: toTimeLog(log) };
  });
}

/**
 * Removes one of the actor's own manual entries, when they typed it wrong. Timed stretches stay: they are what the
 * timer saw. The history keeps what was removed.
 *
 * @returns `not-found` for an entry the project doesn't have, someone else's, a timed one, or one on an archived task.
 */
export async function removeTimeEntry({
  db,
  actorId,
  projectId,
  logId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  logId: string;
}): Promise<{ kind: "ok" } | NotFound> {
  if (!isUuid(logId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<{ kind: "ok" } | NotFound> => {
    const log = await findProjectTimeLog({ db: tx, projectId, id: logId });
    if (!log || log.userId !== actorId || !log.manual || log.archivedAt) return { kind: "not-found" };

    await deleteTimeLog({ db: tx, id: logId });
    const minutes = log.endedAt ? Math.round(secondsBetween(log.startedAt, log.endedAt) / 60) : 0;
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "time.removed",
          projectId,
          taskId: log.taskId,
          before: { logId, date: log.startedAt.toISOString().slice(0, 10), minutes, note: log.note },
          snapshot: {
            code: taskCode({ key: await findProjectKey({ db: tx, projectId }), number: log.number }),
            title: log.title,
          },
        },
      ],
    });
    return { kind: "ok" };
  });
}
