import { z } from "zod";

import type { Database } from "#/db/client.server";
import { isPositionKey, positionBetween, resolvePosition } from "#/lib/position";
import { issuesToErrorData } from "#/lib/schema-issues";
import type { ActivityAction } from "#/orpc/activity/constants";
import { recordActivity } from "#/orpc/activity/service";
import { CHECKLIST_MAX_ITEMS } from "#/orpc/checklist/constants";
import type { ChecklistItem } from "#/orpc/checklist/contract";
import { toChecklistItem } from "#/orpc/checklist/mapper";
import {
  deleteChecklistItem,
  findListEnd,
  findOtherPositions,
  insertChecklistItem,
  lockChecklistItem,
  updateChecklistItem,
  type ChecklistItemRecord,
} from "#/orpc/checklist/repository";
import { checklistTextSchema } from "#/orpc/checklist/validation";
import { publishLive } from "#/orpc/live/publish";
import { taskCode } from "#/orpc/task/constants";
import { findProjectKey, lockTask, type TaskRecord } from "#/orpc/task/repository";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string> };
type NotFound = { kind: "not-found" };
type Saved = { kind: "success"; item: ChecklistItem };
type Done = { kind: "ok" };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Text =====*/
/** The item's text checked and normalized, or the field error to show. */
function parseText(text: string): { text: string } | Invalid {
  const parsed = checklistTextSchema.safeParse(text);
  if (parsed.success) return { text: parsed.data };
  return { kind: "invalid", fields: { text: issuesToErrorData(parsed.error.issues).errors[0] ?? "" } };
}

/*===== History =====*/
/**
 * Records an item's change in the task's history. Only adding, ticking, unticking and removing are recorded: a rename
 * or a reorder is housekeeping, and would bury the entries that say how the work went.
 */
async function recordItem({
  db,
  actorId,
  projectId,
  task,
  action,
  item,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  task: TaskRecord;
  action: Extract<ActivityAction, `checklist.${string}`>;
  item: ChecklistItemRecord;
}): Promise<void> {
  const code = taskCode({ key: await findProjectKey({ db, projectId }), number: task.number });
  const detail = { itemId: item.id, text: item.text };
  await recordActivity({
    db,
    actorId,
    entries: [
      {
        action,
        projectId,
        taskId: task.id,
        ...(action === "checklist.removed" ? { before: detail } : { after: detail }),
        snapshot: { code, title: task.title },
      },
    ],
  });
}

/*===== Add =====*/
/**
 * Adds an item at the end of a live task's checklist.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for a bad text or a list
 * already at `CHECKLIST_MAX_ITEMS`.
 */
export async function addChecklistItem({
  db,
  actorId,
  projectId,
  taskId,
  text,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  text: string;
}): Promise<Saved | NotFound | Invalid> {
  const parsed = parseText(text);
  if ("kind" in parsed) return parsed;
  if (!isUuid(taskId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Saved | NotFound | Invalid> => {
    // The task's lock makes two adds at once take turns, so they never take the same key or pass the limit together.
    const task = await lockTask({ db: tx, projectId, id: taskId });
    if (!task || task.archivedAt) return { kind: "not-found" };
    const end = await findListEnd({ db: tx, taskId });
    if (end.size >= CHECKLIST_MAX_ITEMS) {
      return { kind: "invalid", fields: { text: m.checklist_error_full({ max: CHECKLIST_MAX_ITEMS }) } };
    }
    const record = await insertChecklistItem({
      db: tx,
      values: { taskId, text: parsed.text, position: positionBetween(end.lastPosition, null), createdBy: actorId },
    });
    await recordItem({ db: tx, actorId, projectId, task, action: "checklist.added", item: record });
    return { kind: "success", item: toChecklistItem(record) };
  });
}

/*===== Update =====*/
/**
 * Renames an item, ticks it or unticks it. Ticking stores who and when; unticking clears both. Ticking an item that
 * is already ticked keeps the first tick.
 *
 * @returns `not-found` for an item the project doesn't have or one on an archived task; `invalid` for a bad text.
 */
export async function editChecklistItem({
  db,
  actorId,
  projectId,
  itemId,
  text,
  done,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  itemId: string;
  text?: string | undefined;
  done?: boolean | undefined;
}): Promise<Saved | NotFound | Invalid> {
  const parsed = text === undefined ? undefined : parseText(text);
  if (parsed && "kind" in parsed) return parsed;
  if (!isUuid(itemId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Saved | NotFound | Invalid> => {
    const found = await lockChecklistItem({ db: tx, projectId, id: itemId });
    if (!found) return { kind: "not-found" };
    const { item, task } = found;
    const ticking = done === true && item.doneAt === null;
    const unticking = done === false && item.doneAt !== null;
    const renaming = parsed !== undefined && parsed.text !== item.text;
    if (!ticking && !unticking && !renaming) return { kind: "success", item: toChecklistItem(item) };

    const record = await updateChecklistItem({
      db: tx,
      id: itemId,
      values: {
        ...(renaming ? { text: parsed.text } : {}),
        ...(ticking ? { doneAt: new Date(), doneBy: actorId } : {}),
        ...(unticking ? { doneAt: null, doneBy: null } : {}),
      },
    });
    if (ticking || unticking) {
      const action = ticking ? "checklist.ticked" : "checklist.unticked";
      await recordItem({ db: tx, actorId, projectId, task, action, item: record });
    } else {
      // A rename writes no history, so it tells the open boards itself.
      await publishLive({ db: tx, signals: [{ kind: "project", id: projectId }] });
    }
    return { kind: "success", item: toChecklistItem(record) };
  });
}

/*===== Move =====*/
/**
 * Moves an item within its list. A key another item already holds is resolved to the one just after it.
 *
 * @returns `not-found` for an item the project doesn't have or one on an archived task; `invalid` for a key the
 * library didn't make.
 */
export async function moveChecklistItem({
  db,
  projectId,
  itemId,
  position,
}: {
  db: Database;
  projectId: string;
  itemId: string;
  position: string;
}): Promise<Done | NotFound | Invalid> {
  if (!isPositionKey(position)) return { kind: "invalid", fields: { position: m.task_error_position_invalid() } };
  if (!isUuid(itemId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Done | NotFound> => {
    const found = await lockChecklistItem({ db: tx, projectId, id: itemId });
    if (!found) return { kind: "not-found" };
    const taken = await findOtherPositions({ db: tx, taskId: found.item.taskId, exceptId: itemId });
    const finalPosition = resolvePosition({ wanted: position, taken });
    if (finalPosition !== found.item.position) {
      await updateChecklistItem({ db: tx, id: itemId, values: { position: finalPosition } });
      // A reorder writes no history, so it tells the open boards itself.
      await publishLive({ db: tx, signals: [{ kind: "project", id: projectId }] });
    }
    return { kind: "ok" };
  });
}

/*===== Remove =====*/
/**
 * Deletes an item for good; the history keeps its text.
 *
 * @returns `not-found` for an item the project doesn't have or one on an archived task.
 */
export async function removeChecklistItem({
  db,
  actorId,
  projectId,
  itemId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  itemId: string;
}): Promise<Done | NotFound> {
  if (!isUuid(itemId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Done | NotFound> => {
    const found = await lockChecklistItem({ db: tx, projectId, id: itemId });
    if (!found) return { kind: "not-found" };
    await deleteChecklistItem({ db: tx, id: itemId });
    await recordItem({ db: tx, actorId, projectId, task: found.task, action: "checklist.removed", item: found.item });
    return { kind: "ok" };
  });
}
