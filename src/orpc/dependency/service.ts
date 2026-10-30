import { z } from "zod";

import type { Database } from "#/db/client.server";
import { recordActivity } from "#/orpc/activity/service";
import { deleteDependency, insertDependency, wouldCycle } from "#/orpc/dependency/repository";
import { taskCode } from "#/orpc/task/constants";
import { findProjectKey, lockTask, type TaskRecord } from "#/orpc/task/repository";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Result = { kind: "ok" } | { kind: "not-found" } | { kind: "invalid"; fields: Record<string, string> };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/**
 * Locks both tasks of a link, in id order so two links made at once between the same tasks take turns instead of
 * deadlocking. Only live tasks of the project count.
 */
async function lockPair({
  db,
  projectId,
  taskId,
  blockerId,
}: {
  db: Database;
  projectId: string;
  taskId: string;
  blockerId: string;
}): Promise<{ waiting: TaskRecord; blocker: TaskRecord } | null> {
  const locked = new Map<string, TaskRecord | undefined>();
  for (const id of [taskId, blockerId].toSorted()) locked.set(id, await lockTask({ db, projectId, id }));
  const waiting = locked.get(taskId);
  const blocker = locked.get(blockerId);
  if (!waiting || !blocker || waiting.archivedAt || blocker.archivedAt) return null;
  return { waiting, blocker };
}

/*===== Add =====*/
/**
 * Makes one task wait for another of the same project. A task can't wait for itself, and a link that would close a
 * loop (the blocker already waits for the task, directly or through others) is refused: the tasks could never start.
 * Adding a link that exists is a no-op.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for itself or a loop.
 */
export async function addDependency({
  db,
  actorId,
  projectId,
  taskId,
  blockerId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  blockerId: string;
}): Promise<Result> {
  if (!isUuid(taskId) || !isUuid(blockerId)) return { kind: "not-found" };
  if (taskId === blockerId) return { kind: "invalid", fields: { blockerId: m.dependency_error_self() } };

  return db.transaction(async (tx): Promise<Result> => {
    const pair = await lockPair({ db: tx, projectId, taskId, blockerId });
    if (!pair) return { kind: "not-found" };
    if (await wouldCycle({ db: tx, taskId, blockerId })) {
      return { kind: "invalid", fields: { blockerId: m.dependency_error_cycle() } };
    }
    if (!(await insertDependency({ db: tx, values: { taskId, blockerId, createdBy: actorId } }))) return { kind: "ok" };

    const key = await findProjectKey({ db: tx, projectId });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "dependency.added",
          projectId,
          taskId,
          after: { blockerId, blockerCode: taskCode({ key, number: pair.blocker.number }) },
          snapshot: { code: taskCode({ key, number: pair.waiting.number }), title: pair.waiting.title },
        },
      ],
    });
    return { kind: "ok" };
  });
}

/*===== Remove =====*/
/** Stops a task waiting for another. Removing a link that isn't there is a no-op. */
export async function removeDependency({
  db,
  actorId,
  projectId,
  taskId,
  blockerId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  blockerId: string;
}): Promise<Result> {
  if (!isUuid(taskId) || !isUuid(blockerId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Result> => {
    const pair = await lockPair({ db: tx, projectId, taskId, blockerId });
    if (!pair) return { kind: "not-found" };
    if (!(await deleteDependency({ db: tx, taskId, blockerId }))) return { kind: "ok" };

    const key = await findProjectKey({ db: tx, projectId });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "dependency.removed",
          projectId,
          taskId,
          before: { blockerId, blockerCode: taskCode({ key, number: pair.blocker.number }) },
          snapshot: { code: taskCode({ key, number: pair.waiting.number }), title: pair.waiting.title },
        },
      ],
    });
    return { kind: "ok" };
  });
}
