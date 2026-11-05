import { z } from "zod";

import type { Database } from "#/db/client.server";
import { publishLive } from "#/orpc/live/publish";
import type { WatchedEvent } from "#/orpc/notification/constants";
import { notify } from "#/orpc/notification/service";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Person } from "#/orpc/project/contract";
import { toPerson } from "#/orpc/project/mapper";
import { taskCode } from "#/orpc/task/constants";
import { findAssigneeIdsByTask, findProjectKey, lockTask } from "#/orpc/task/repository";
import {
  deleteWatcher,
  findPossibleWatchers,
  findWatchers,
  findWatchersToTell,
  insertWatchers,
} from "#/orpc/watcher/repository";

/*===== Types =====*/
type NotFound = { kind: "not-found" };
type Watchers = { kind: "success"; watchers: Person[] };

/** The task fields watching needs: its owner, who already hears about it. */
type WatchedTask = { id: string; number: number; title: string; ownerId: string };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Read =====*/
export async function getWatchers({ db, taskId }: { db: Database; taskId: string }): Promise<Person[]> {
  return (await findWatchers({ db, taskId })).map(toPerson);
}

/*===== Watch =====*/
/**
 * Starts or stops the person watching a card (docs/task-manager-plan.md → slice 17). A personal setting: it writes no
 * history, so a viewer may do it; other open drawers hear of it through the live stream. Unwatching works on an
 * archived card too, watching only on a live one.
 *
 * @returns The card's watchers, or `not-found` for a task the project doesn't have.
 */
export async function setWatching({
  db,
  userId,
  projectId,
  taskId,
  watching,
}: {
  db: Database;
  userId: string;
  projectId: string;
  taskId: string;
  watching: boolean;
}): Promise<Watchers | NotFound> {
  if (!isUuid(taskId)) return { kind: "not-found" };
  return db.transaction(async (tx): Promise<Watchers | NotFound> => {
    const task = await lockTask({ db: tx, projectId, id: taskId });
    if (!task || (watching && task.archivedAt)) return { kind: "not-found" };
    if (watching) await insertWatchers({ db: tx, taskId, userIds: [userId] });
    else await deleteWatcher({ db: tx, taskId, userId });
    await publishLive({ db: tx, signals: [{ kind: "project", id: projectId }] });
    return { kind: "success", watchers: await getWatchers({ db: tx, taskId }) };
  });
}

/**
 * Makes people watch a card because they took part in it: commenting, or being mentioned. The owner and assignee are
 * left out, since they hear about the card already, and so is anyone who can't read the project.
 */
export async function autoWatch({
  db,
  projectId,
  task,
  userIds,
}: {
  db: Database;
  projectId: string;
  task: WatchedTask;
  userIds: string[];
}): Promise<void> {
  const assignees = (await findAssigneeIdsByTask({ db, taskIds: [task.id] })).get(task.id) ?? [];
  const ids = [...new Set(userIds)].filter((id) => id !== task.ownerId && !assignees.includes(id));
  await insertWatchers({ db, taskId: task.id, userIds: await findPossibleWatchers({ db, projectId, ids }) });
}

/*===== Tell =====*/
/**
 * Tells a card's watchers what happened to it, inside the change's transaction, along with anyone in `also`, who hear
 * of it without watching. Never the actor, and never anyone in `except`: those the same change already told as
 * assignee, owner or mentioned get only that notification. `notifyCard` adds the card's own people.
 */
export async function notifyWatchers({
  db,
  actorId,
  projectId,
  task,
  event,
  note = null,
  columnKind,
  also = [],
  except = [],
}: {
  db: Database;
  actorId: string;
  projectId: string;
  task: Pick<WatchedTask, "id" | "number" | "title">;
  event: WatchedEvent;
  note?: string | null;
  /** For `moved`: the kind of the column it went to (`note` is that column's name, if it has one). */
  columnKind?: ColumnKind;
  also?: Iterable<string>;
  except?: Iterable<string>;
}): Promise<void> {
  const skip = new Set(except);
  const watchers = await findWatchersToTell({ db, projectId, taskId: task.id });
  const ids = [...new Set([...watchers, ...also])].filter((id) => !skip.has(id));
  if (ids.length === 0) return;
  const key = await findProjectKey({ db, projectId });
  await notify({
    db,
    actorId,
    entries: ids.map((userId) => ({
      userId,
      kind: "watched" as const,
      projectId,
      taskId: task.id,
      data: {
        projectKey: key,
        taskCode: taskCode({ key, number: task.number }),
        taskTitle: task.title,
        note,
        event,
        ...(columnKind ? { columnKind } : {}),
      },
    })),
  });
}

/**
 * Tells everyone a card concerns: `notifyWatchers`, plus its owner and assignees, who never become watchers
 * (`autoWatch`). Someone who left the project hears nothing. Each person is told once, and never about their own doing.
 */
export async function notifyCard({
  db,
  projectId,
  task,
  ...change
}: Omit<Parameters<typeof notifyWatchers>[0], "task" | "also"> & {
  task: Pick<WatchedTask, "id" | "number" | "title" | "ownerId">;
}): Promise<void> {
  const assignees = (await findAssigneeIdsByTask({ db, taskIds: [task.id] })).get(task.id) ?? [];
  const also = await findPossibleWatchers({ db, projectId, ids: [task.ownerId, ...assignees] });
  await notifyWatchers({ db, projectId, task, also, ...change });
}
