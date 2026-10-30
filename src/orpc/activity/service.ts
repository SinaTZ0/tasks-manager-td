import { z } from "zod";

import type { Database } from "#/db/client.server";
import { ACTIVITY_ACTIONS, type ActivityAction } from "#/orpc/activity/constants";
import type { ActivityItem, ActivityPage } from "#/orpc/activity/contract";
import { avatarUrlOf } from "#/orpc/project/mapper";
import {
  type ActivityRow,
  findProjectHistory,
  findProjectHistoryBetween,
  findTaskHistory,
  insertActivities,
} from "#/orpc/activity/repository";
import { publishLive } from "#/orpc/live/publish";

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
 * bug. Each project it names is also published to the open boards (`publishLive`), on commit.
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
  // Every change to a project writes history, so this is where open boards hear about it (slice 16).
  const projectIds = entries.flatMap((entry) => (entry.projectId ? [entry.projectId] : []));
  await publishLive({ db, signals: projectIds.map((id) => ({ kind: "project" as const, id })) });
}

/*===== Read =====*/
const TASK_HISTORY_LIMIT = 200;
const PROJECT_PAGE_SIZE = 50;

const isUuid = (value: string) => z.guid().safeParse(value).success;
const isAction = (value: string): value is ActivityAction => (ACTIVITY_ACTIONS as readonly string[]).includes(value);
const textOf = (value: unknown) => (typeof value === "string" ? value : null);
const fieldsOf = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** Rows as the history pages read them. A row with an action this code no longer knows is left out. */
function toItems(rows: ActivityRow[]): ActivityItem[] {
  return rows.flatMap((row) => {
    if (!isAction(row.action)) return [];
    const snapshot = fieldsOf(row.snapshot) ?? {};
    return [
      {
        id: row.id,
        action: row.action,
        actorId: row.actorId,
        actorName: row.actorName,
        actorAvatarUrl: avatarUrlOf(row.actorAvatarMediaId),
        taskId: row.taskId,
        taskCode: textOf(snapshot.code),
        taskTitle: textOf(snapshot.title),
        before: fieldsOf(row.before),
        after: fieldsOf(row.after),
        snapshot,
        createdAt: row.createdAt,
      },
    ];
  });
}

/** A task's history, newest first: its latest 200 entries. The caller has checked the viewer is on the project. */
export async function getTaskHistory({
  db,
  projectId,
  taskId,
}: {
  db: Database;
  projectId: string;
  taskId: string;
}): Promise<ActivityItem[]> {
  if (!isUuid(taskId)) return [];
  return toItems(await findTaskHistory({ db, projectId, taskId, limit: TASK_HISTORY_LIMIT }));
}

/**
 * One page of a project's history, newest first, made before `before`. The changes of one transaction share a
 * timestamp, and the cursor is a `Date` (milliseconds, where Postgres keeps microseconds), so a page never ends inside
 * one millisecond: it takes the whole of its last one, and the next page starts below it. A page can run a little over
 * 50 for that.
 */
export async function getProjectHistory({
  db,
  projectId,
  before,
}: {
  db: Database;
  projectId: string;
  before: Date | undefined;
}): Promise<ActivityPage> {
  const rows = await findProjectHistory({ db, projectId, before, limit: PROJECT_PAGE_SIZE + 1 });
  if (rows.length <= PROJECT_PAGE_SIZE) return { items: toItems(rows), nextCursor: null };

  const last = rows[PROJECT_PAGE_SIZE - 1];
  if (!last) return { items: toItems(rows), nextCursor: null };
  // `Date` drops the microseconds, so this is the start of the last row's millisecond.
  const boundary = new Date(last.createdAt.getTime());
  const page = await findProjectHistoryBetween({ db, projectId, from: boundary, before });
  return { items: toItems(page), nextCursor: boundary };
}
