import type { Database } from "#/db/client.server";
import type { ActivityAction } from "#/orpc/activity/constants";
import { insertActivities } from "#/orpc/activity/repository";

/*===== Record =====*/
/** One change, as the history keeps it. */
export type ActivityEntry = {
  action: ActivityAction;
  /** Omitted for changes to the team itself (accounts and roles). */
  projectId?: string;
  taskId?: string;
  /** The changed fields as they were, and as they are now. */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** What the entry needs to read well later, when names have changed: a task's code and title, a user's name. */
  snapshot?: Record<string, unknown>;
};

/**
 * Records changes in the history (docs/app.md rule 7). Call it with the transaction that makes the change, so the
 * change and its entry land together or not at all; a service that changes a project or task without calling it is a
 * bug.
 */
export async function recordActivity({
  db,
  actorId,
  entries,
}: {
  db: Database;
  actorId: string;
  entries: ActivityEntry[];
}): Promise<void> {
  await insertActivities({
    db,
    values: entries.map((entry) => ({
      actorId,
      action: entry.action,
      projectId: entry.projectId ?? null,
      taskId: entry.taskId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      snapshot: entry.snapshot ?? {},
    })),
  });
}
