import { and, asc, eq, inArray, isNotNull, or } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { projectMember, task, taskWatcher, user } from "#/db/schema";
import type { PersonRow } from "#/orpc/task/repository";

/*===== Writes =====*/
/** Adds watchers to a task; anyone already watching it stays as they were. */
export async function insertWatchers({
  db,
  taskId,
  userIds,
}: {
  db: Database;
  taskId: string;
  userIds: string[];
}): Promise<void> {
  if (userIds.length === 0) return;
  await db
    .insert(taskWatcher)
    .values(userIds.map((userId) => ({ taskId, userId })))
    .onConflictDoNothing();
}

export async function deleteWatcher({ db, taskId, userId }: { db: Database; taskId: string; userId: string }) {
  await db.delete(taskWatcher).where(and(eq(taskWatcher.taskId, taskId), eq(taskWatcher.userId, userId)));
}

/*===== Reads =====*/
/** A task's watchers as people, in the order they started watching. */
export function findWatchers({ db, taskId }: { db: Database; taskId: string }): Promise<PersonRow[]> {
  return db
    .select({ id: user.id, name: user.name, role: user.role, status: user.status, avatarMediaId: user.avatarMediaId })
    .from(taskWatcher)
    .innerJoin(user, eq(user.id, taskWatcher.userId))
    .where(eq(taskWatcher.taskId, taskId))
    .orderBy(asc(taskWatcher.createdAt), asc(user.name));
}

/** Which of a project's tasks the person watches. */
export async function findWatchedTaskIds({
  db,
  projectId,
  userId,
}: {
  db: Database;
  projectId: string;
  userId: string;
}): Promise<string[]> {
  const rows = await db
    .select({ id: taskWatcher.taskId })
    .from(taskWatcher)
    .innerJoin(task, eq(task.id, taskWatcher.taskId))
    .where(and(eq(taskWatcher.userId, userId), eq(task.projectId, projectId)));
  return rows.map((row) => row.id);
}

/**
 * A task's watchers who may still read it: active, and on the project or an admin (who sees every project). Someone
 * who left the project keeps their row, so watching resumes if they come back, but hears nothing meanwhile.
 */
export async function findWatchersToTell({
  db,
  projectId,
  taskId,
}: {
  db: Database;
  projectId: string;
  taskId: string;
}): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(taskWatcher)
    .innerJoin(user, eq(user.id, taskWatcher.userId))
    .leftJoin(projectMember, and(eq(projectMember.projectId, projectId), eq(projectMember.userId, user.id)))
    .where(
      and(
        eq(taskWatcher.taskId, taskId),
        eq(user.status, "active"),
        or(isNotNull(projectMember.userId), eq(user.role, "admin")),
      ),
    );
  return rows.map((row) => row.id);
}

/** The people among `ids` who may watch a project's task: active, and on the project or an admin. */
export async function findPossibleWatchers({
  db,
  projectId,
  ids,
}: {
  db: Database;
  projectId: string;
  ids: string[];
}): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .leftJoin(projectMember, and(eq(projectMember.projectId, projectId), eq(projectMember.userId, user.id)))
    .where(
      and(
        inArray(user.id, ids),
        eq(user.status, "active"),
        or(isNotNull(projectMember.userId), eq(user.role, "admin")),
      ),
    );
  return rows.map((row) => row.id);
}
