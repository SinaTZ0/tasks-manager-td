import { and, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "#/db/client.server";
import { project, task, taskAlias, taskDependency } from "#/db/schema";

/*===== Projects =====*/
export async function findProjectById({
  db,
  id,
}: {
  db: Database;
  id: string;
}): Promise<{ id: string; key: string } | undefined> {
  const [row] = await db.select({ id: project.id, key: project.key }).from(project).where(eq(project.id, id)).limit(1);
  return row;
}

/*===== Dependencies =====*/
/** One link a task is part of, either way round, with both tasks' numbers and the waiting one's title. */
export type TaskLink = {
  taskId: string;
  blockerId: string;
  waitingNumber: number;
  waitingTitle: string;
  blockerNumber: number;
};

/** Every link the task is part of: what it waits for, and what waits for it. Links never cross projects. */
export async function findTaskLinks({ db, taskId }: { db: Database; taskId: string }): Promise<TaskLink[]> {
  const waiting = alias(task, "waiting");
  const blocker = alias(task, "blocker");
  return db
    .select({
      taskId: taskDependency.taskId,
      blockerId: taskDependency.blockerId,
      waitingNumber: waiting.number,
      waitingTitle: waiting.title,
      blockerNumber: blocker.number,
    })
    .from(taskDependency)
    .innerJoin(waiting, eq(waiting.id, taskDependency.taskId))
    .innerJoin(blocker, eq(blocker.id, taskDependency.blockerId))
    .where(or(eq(taskDependency.taskId, taskId), eq(taskDependency.blockerId, taskId)));
}

export async function deleteTaskLinks({ db, taskId }: { db: Database; taskId: string }): Promise<void> {
  await db.delete(taskDependency).where(or(eq(taskDependency.taskId, taskId), eq(taskDependency.blockerId, taskId)));
}

/*===== Aliases =====*/
export async function insertAlias({
  db,
  projectId,
  number,
  taskId,
}: {
  db: Database;
  projectId: string;
  number: number;
  taskId: string;
}): Promise<void> {
  await db.insert(taskAlias).values({ projectId, number, taskId });
}

/** The task an old code names, where it is now: its project and number. */
export async function findAliasedTask({
  db,
  projectId,
  number,
}: {
  db: Database;
  projectId: string;
  number: number;
}): Promise<{ taskId: string; projectId: string; projectKey: string; number: number } | undefined> {
  const [row] = await db
    .select({ taskId: task.id, projectId: task.projectId, projectKey: project.key, number: task.number })
    .from(taskAlias)
    .innerJoin(task, eq(task.id, taskAlias.taskId))
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(eq(taskAlias.projectId, projectId), eq(taskAlias.number, number)))
    .limit(1);
  return row;
}
