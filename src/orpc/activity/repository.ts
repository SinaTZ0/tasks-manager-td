import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { activity, user } from "#/db/schema";
import type { ActivityAction } from "#/orpc/activity/constants";

/*===== Types =====*/
type NewActivityRecord = typeof activity.$inferInsert;
export type ActivityRecord = typeof activity.$inferSelect;
/** An entry with its actor's name, for the history pages. */
export type ActivityRow = ActivityRecord & { actorName: string; actorAvatarMediaId: string | null };

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
    .orderBy(asc(activity.createdAt), asc(activity.seq));
}

/*===== History Pages =====*/
const rowColumns = {
  id: activity.id,
  projectId: activity.projectId,
  taskId: activity.taskId,
  actorId: activity.actorId,
  action: activity.action,
  before: activity.before,
  after: activity.after,
  snapshot: activity.snapshot,
  createdAt: activity.createdAt,
  seq: activity.seq,
  actorName: user.name,
  actorAvatarMediaId: user.avatarMediaId,
};

/** A task's entries, newest first, at most `limit`. */
export function findTaskHistory({
  db,
  projectId,
  taskId,
  limit,
}: {
  db: Database;
  projectId: string;
  taskId: string;
  limit: number;
}): Promise<ActivityRow[]> {
  return db
    .select(rowColumns)
    .from(activity)
    .innerJoin(user, eq(user.id, activity.actorId))
    .where(and(eq(activity.projectId, projectId), eq(activity.taskId, taskId)))
    .orderBy(desc(activity.createdAt), desc(activity.seq))
    .limit(limit);
}

/**
 * A project's entries made before `before` (all of them without it), newest first: `limit` of them, or one more to
 * tell whether more are left.
 */
export function findProjectHistory({
  db,
  projectId,
  before,
  limit,
}: {
  db: Database;
  projectId: string;
  before: Date | undefined;
  limit: number;
}): Promise<ActivityRow[]> {
  return db
    .select(rowColumns)
    .from(activity)
    .innerJoin(user, eq(user.id, activity.actorId))
    .where(and(eq(activity.projectId, projectId), before ? lt(activity.createdAt, before) : undefined))
    .orderBy(desc(activity.createdAt), desc(activity.seq))
    .limit(limit);
}

/** A project's entries from `from` (inclusive) up to `before` (exclusive, or to now), newest first. */
export function findProjectHistoryBetween({
  db,
  projectId,
  from,
  before,
}: {
  db: Database;
  projectId: string;
  from: Date;
  before: Date | undefined;
}): Promise<ActivityRow[]> {
  return db
    .select(rowColumns)
    .from(activity)
    .innerJoin(user, eq(user.id, activity.actorId))
    .where(
      and(
        eq(activity.projectId, projectId),
        gte(activity.createdAt, from),
        before ? lt(activity.createdAt, before) : undefined,
      ),
    )
    .orderBy(desc(activity.createdAt), desc(activity.seq));
}
