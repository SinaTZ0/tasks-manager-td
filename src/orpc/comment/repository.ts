import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { comment, task, user } from "#/db/schema";

/*===== Types =====*/
export type CommentRecord = typeof comment.$inferSelect;
export type CommentRow = CommentRecord & { authorName: string; authorAvatarMediaId: string | null };
/** A comment with the task it is on, as an edit or a delete needs it. */
export type CommentWithTask = {
  comment: CommentRecord;
  task: {
    id: string;
    number: number;
    title: string;
    ownerId: string;
    assigneeId: string | null;
    archivedAt: Date | null;
  };
};

/*===== Counts =====*/
/** Per task: how many comments it has, leaving out deleted ones, for the board's cards. */
export async function countComments({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({ taskId: comment.taskId, total: count() })
    .from(comment)
    .where(and(inArray(comment.taskId, taskIds), isNull(comment.deletedAt)))
    .groupBy(comment.taskId);
  return new Map(rows.map((row) => [row.taskId, row.total]));
}

/*===== Writes =====*/
export async function insertComment({
  db,
  values,
}: {
  db: Database;
  values: typeof comment.$inferInsert;
}): Promise<CommentRecord> {
  const [row] = await db.insert(comment).values(values).returning();
  if (!row) throw new Error("insertComment: insert returned no row");
  return row;
}

export async function updateComment({
  db,
  id,
  values,
}: {
  db: Database;
  id: string;
  values: Partial<typeof comment.$inferInsert>;
}): Promise<CommentRecord> {
  const [row] = await db.update(comment).set(values).where(eq(comment.id, id)).returning();
  if (!row) throw new Error("updateComment: no row");
  return row;
}

/*===== Reads =====*/
/**
 * A task's comments, oldest first, with their authors' names; deleted ones too, so the thread keeps its shape. Only
 * when the task is the project's.
 */
export function findComments({
  db,
  projectId,
  taskId,
}: {
  db: Database;
  projectId: string;
  taskId: string;
}): Promise<CommentRow[]> {
  return db
    .select({
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      body: comment.body,
      bodyText: comment.bodyText,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      deletedAt: comment.deletedAt,
      authorName: user.name,
      authorAvatarMediaId: user.avatarMediaId,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.authorId))
    .innerJoin(task, eq(task.id, comment.taskId))
    .where(and(eq(comment.taskId, taskId), eq(task.projectId, projectId)))
    .orderBy(asc(comment.createdAt));
}

/** A comment on one of the project's tasks, locked until the transaction ends. */
export async function lockComment({
  db,
  projectId,
  id,
}: {
  db: Database;
  projectId: string;
  id: string;
}): Promise<CommentWithTask | undefined> {
  const [row] = await db
    .select({
      comment,
      task: {
        id: task.id,
        number: task.number,
        title: task.title,
        ownerId: task.ownerId,
        assigneeId: task.assigneeId,
        archivedAt: task.archivedAt,
      },
    })
    .from(comment)
    .innerJoin(task, eq(task.id, comment.taskId))
    .where(and(eq(comment.id, id), eq(task.projectId, projectId)))
    .limit(1)
    .for("update", { of: comment });
  return row;
}
