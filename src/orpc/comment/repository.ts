import type { Database } from "#/db/client.server";
import { comment } from "#/db/schema";

/*===== Types =====*/
export type CommentRecord = typeof comment.$inferSelect;

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
