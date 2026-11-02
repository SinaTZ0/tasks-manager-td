import { inArray, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { activity } from "#/db/schema";

/*===== Test Cleanup =====*/
/**
 * Deletes the history entries a test run wrote, so its users and projects can be deleted after them. History is
 * append-only (`src/db/activity-append-only.sql`); the trigger lets a delete through only in a transaction that
 * set `tofang.test_cleanup`, which nothing but the integration tests does.
 */
export async function deleteTestActivity({ db, actorIds }: { db: Database; actorIds: string[] }): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`set local tofang.test_cleanup = 'on'`);
    await tx.delete(activity).where(inArray(activity.actorId, actorIds));
  });
}
