import { and, asc, count, eq, inArray } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { attachment, task } from "#/db/schema";
import type { TaskRecord } from "#/orpc/task/repository";

/*===== Types =====*/
export type AttachmentRecord = typeof attachment.$inferSelect;
type NewAttachmentRecord = typeof attachment.$inferInsert;

/*===== Reads =====*/
/** The tasks' attachments, oldest first. */
export function findAttachments({ db, taskIds }: { db: Database; taskIds: string[] }): Promise<AttachmentRecord[]> {
  if (taskIds.length === 0) return Promise.resolve([]);
  return db
    .select()
    .from(attachment)
    .where(inArray(attachment.taskId, taskIds))
    .orderBy(asc(attachment.taskId), asc(attachment.createdAt));
}

/** Per task: how many attachments it has, for the board's cards. */
export async function countAttachments({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({ taskId: attachment.taskId, total: count() })
    .from(attachment)
    .where(inArray(attachment.taskId, taskIds))
    .groupBy(attachment.taskId);
  return new Map(rows.map((row) => [row.taskId, row.total]));
}

/**
 * One attachment, locked until the transaction ends, with its task (unlocked: the history only quotes its code and
 * title), if it belongs to a live task of the project.
 */
export async function lockAttachment({
  db,
  projectId,
  id,
}: {
  db: Database;
  projectId: string;
  id: string;
}): Promise<{ attachment: AttachmentRecord; task: TaskRecord } | undefined> {
  const [row] = await db
    .select({ attachment, task })
    .from(attachment)
    .innerJoin(task, eq(task.id, attachment.taskId))
    .where(and(eq(attachment.id, id), eq(task.projectId, projectId)))
    .limit(1)
    .for("update", { of: attachment });
  return row && !row.task.archivedAt ? row : undefined;
}

/*===== Writes =====*/
export async function insertAttachment({
  db,
  values,
}: {
  db: Database;
  values: NewAttachmentRecord;
}): Promise<AttachmentRecord> {
  const [row] = await db.insert(attachment).values(values).returning();
  if (!row) throw new Error("insertAttachment: insert returned no row");
  return row;
}

export async function deleteAttachment({ db, id }: { db: Database; id: string }): Promise<void> {
  await db.delete(attachment).where(eq(attachment.id, id));
}
