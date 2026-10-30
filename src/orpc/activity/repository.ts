import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { activity } from "#/db/schema";
import type { ActivityAction } from "#/orpc/activity/constants";

/*===== Types =====*/
type NewActivityRecord = typeof activity.$inferInsert;
export type ActivityRecord = typeof activity.$inferSelect;

/*===== Writes =====*/
/** Appends history entries. There is no update or delete: the table refuses both. */
export async function insertActivities({ db, values }: { db: Database; values: NewActivityRecord[] }): Promise<void> {
  if (values.length === 0) return;
  await db.insert(activity).values(values);
}

/*===== Reads =====*/
/** A task's entries of the given kinds, oldest first. */
export function findTaskActivities({
  db,
  taskId,
  actions,
}: {
  db: Database;
  taskId: string;
  actions: readonly ActivityAction[];
}): Promise<ActivityRecord[]> {
  return db
    .select()
    .from(activity)
    .where(and(eq(activity.taskId, taskId), inArray(activity.action, [...actions])))
    .orderBy(asc(activity.createdAt));
}
