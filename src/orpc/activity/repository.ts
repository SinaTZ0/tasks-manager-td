import type { Database } from "#/db/client.server";
import { activity } from "#/db/schema";

/*===== Types =====*/
type NewActivityRecord = typeof activity.$inferInsert;

/*===== Writes =====*/
/** Appends history entries. There is no update or delete: the table refuses both. */
export async function insertActivities({ db, values }: { db: Database; values: NewActivityRecord[] }): Promise<void> {
  if (values.length === 0) return;
  await db.insert(activity).values(values);
}
