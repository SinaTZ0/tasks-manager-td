import { randomUUID } from "node:crypto";

import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";

import type { Database } from "#/db/client.server";
import { formatList } from "#/lib/locale";
import { recordActivity, type ActivityEntry } from "#/orpc/activity/service";
import { copyFiles, discardFiles } from "#/orpc/attachment/files.server";
import { findAttachments, insertAttachment } from "#/orpc/attachment/repository";
import { findChecklistItems, insertChecklistItem } from "#/orpc/checklist/repository";
import type { ColumnKind } from "#/orpc/project/constants";
import { canAccessProject } from "#/orpc/project/service";
import { taskCode } from "#/orpc/task/constants";
import {
  findActiveMemberIds,
  findColumn,
  findColumnByKind,
  findLabelByName,
  findAssigneeIdsByTask,
  findLabelIdsByTask,
  findLabels,
  findLastPosition,
  findPeople,
  insertLabel,
  insertTask,
  lockTask,
  replaceTaskLabels,
  takeTaskNumber,
  updateTaskRow,
  type ColumnRow,
  type TaskRecord,
} from "#/orpc/task/repository";
import { columnEffects, type TaskActor } from "#/orpc/task/service";
import {
  deleteTaskLinks,
  findAliasedTask,
  findProjectById,
  findTaskLinks,
  insertAlias,
} from "#/orpc/transfer/repository";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string>; errors?: string[] };
type NotFound = { kind: "not-found" };
/** Where the card is now (a move) or where its copy is: the project's key and the card's number there. */
type Placed = { kind: "success"; projectKey: string; number: number };

type TransferInput = {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  targetProjectId: string;
  /** The kind of column it goes to in the target; the kind it is in now by default. */
  columnKind?: ColumnKind | undefined;
};

const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Shared Steps =====*/
/** The source task (live) and the target project, or why the transfer can't happen. */
async function locate({
  db,
  projectId,
  taskId,
  targetProjectId,
}: Pick<TransferInput, "db" | "projectId" | "taskId" | "targetProjectId">): Promise<
  { task: TaskRecord; from: ColumnRow; target: { id: string; key: string } } | NotFound | Invalid
> {
  if (!isUuid(taskId)) return { kind: "not-found" };
  const task = await lockTask({ db, projectId, id: taskId });
  if (!task || task.archivedAt) return { kind: "not-found" };
  const target = isUuid(targetProjectId) ? await findProjectById({ db, id: targetProjectId }) : undefined;
  if (!target) return { kind: "invalid", fields: { targetProjectId: m.transfer_error_project() } };
  if (target.id === projectId) return { kind: "invalid", fields: { targetProjectId: m.transfer_error_same_project() } };
  const from = await findColumn({ db, projectId, columnId: task.columnId });
  if (!from) throw new Error("transfer: the task's column is missing");
  return { task, from, target };
}

/**
 * The target's labels for the task's labels, matched by name; a name the target lacks is created there, in the same
 * colour, with its history entry.
 */
async function matchLabels({
  db,
  actorId,
  task,
  targetProjectId,
}: {
  db: Database;
  actorId: string;
  task: TaskRecord;
  targetProjectId: string;
}): Promise<string[]> {
  const ids = (await findLabelIdsByTask({ db, taskIds: [task.id] })).get(task.id) ?? [];
  if (ids.length === 0) return [];
  const sourceLabels = (await findLabels({ db, projectId: task.projectId })).filter((row) => ids.includes(row.id));
  const matched: string[] = [];
  for (const source of sourceLabels) {
    const existing = await findLabelByName({ db, projectId: targetProjectId, name: source.name });
    if (existing) {
      matched.push(existing.id);
      continue;
    }
    const created = await insertLabel({
      db,
      values: { projectId: targetProjectId, name: source.name, color: source.color },
    });
    await recordActivity({
      db,
      actorId,
      entries: [
        {
          action: "label.created",
          projectId: targetProjectId,
          after: { labelId: created.id, name: created.name, color: created.color },
        },
      ],
    });
    matched.push(created.id);
  }
  return matched;
}

/*===== Move =====*/
/**
 * Moves a card to another project (docs/task-manager-plan.md → slice 20): it takes the target's next number, and its
 * comments, checklist, attachments, time, hand-offs, watchers and history go with it, since they hang on the task.
 * Labels are matched by name. Its dependencies are all in the old project, so they are removed, each with a history
 * entry there. The old code becomes an alias, so links to it still open the card. Both projects' histories say where it
 * went. Admin-only, like creating a card: the procedure checks the role.
 *
 * @returns Its new place; `not-found` for a task the project doesn't have or an archived one; `invalid` for a missing
 * or same target, or an owner or assignees who aren't active editors on the target (named in the message).
 */
export async function moveTaskToProject({
  db,
  actorId,
  projectId,
  taskId,
  targetProjectId,
  columnKind,
}: TransferInput): Promise<Placed | NotFound | Invalid> {
  return db.transaction(async (tx): Promise<Placed | NotFound | Invalid> => {
    const found = await locate({ db: tx, projectId, taskId, targetProjectId });
    if ("kind" in found) return found;
    const { task, from, target } = found;

    /*------ People ------*/
    // The target must have the people the card names: a card can't be owned or done by someone off its project.
    const assigneeIds = (await findAssigneeIdsByTask({ db: tx, taskIds: [task.id] })).get(task.id) ?? [];
    const named = [...new Set([task.ownerId, ...assigneeIds])];
    const onTarget = await findActiveMemberIds({ db: tx, projectId: target.id, ids: named, editorsOnly: true });
    const missing = named.filter((id) => !onTarget.has(id));
    if (missing.length > 0) {
      const names = (await findPeople({ db: tx, ids: missing })).map((person) => person.name);
      return { kind: "invalid", fields: {}, errors: [m.transfer_error_not_member({ names: formatList(names) })] };
    }

    /*------ Dependencies ------*/
    const sourceKey = (await findProjectById({ db: tx, id: projectId }))?.key ?? "";
    const links = await findTaskLinks({ db: tx, taskId: task.id });
    await deleteTaskLinks({ db: tx, taskId: task.id });
    const unlinked: ActivityEntry[] = links.map((link) => ({
      action: "dependency.removed",
      projectId,
      taskId: link.taskId,
      before: { blockerId: link.blockerId, blockerCode: taskCode({ key: sourceKey, number: link.blockerNumber }) },
      snapshot: { code: taskCode({ key: sourceKey, number: link.waitingNumber }), title: link.waitingTitle },
    }));

    /*------ Place ------*/
    // A custom column is this board's own; on another board the card starts in to do.
    const kind = columnKind ?? (from.kind === "custom" ? "todo" : (from.kind as ColumnKind));
    if (kind === "custom") return { kind: "invalid", fields: { columnKind: m.transfer_error_custom() } };
    const to = await findColumnByKind({ db: tx, projectId: target.id, kind });
    // Entering or leaving done sets or clears when it finished, as on a board.
    const effects = await columnEffects({ db: tx, actorId, task, from: from.kind, to: kind });
    const labelIds = await matchLabels({ db: tx, actorId, task, targetProjectId: target.id });
    const number = await takeTaskNumber({ db: tx, projectId: target.id });
    const position = generateKeyBetween(await findLastPosition({ db: tx, columnId: to.id }), null);
    await updateTaskRow({
      db: tx,
      id: task.id,
      values: { projectId: target.id, number, columnId: to.id, position, ...effects },
    });
    await replaceTaskLabels({ db: tx, taskId: task.id, labelIds });
    await insertAlias({ db: tx, projectId, number: task.number, taskId: task.id });

    /*------ History ------*/
    const oldCode = taskCode({ key: sourceKey, number: task.number });
    const newCode = taskCode({ key: target.key, number });
    const fields = {
      before: { projectId, code: oldCode },
      after: { projectId: target.id, code: newCode, columnId: to.id, columnKind: to.kind, columnName: to.name },
    };
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        ...unlinked,
        {
          action: "task.transferred",
          projectId,
          taskId: task.id,
          ...fields,
          snapshot: { code: oldCode, title: task.title },
        },
        {
          action: "task.transferred",
          projectId: target.id,
          taskId: task.id,
          ...fields,
          snapshot: { code: newCode, title: task.title },
        },
      ],
    });
    return { kind: "success", projectKey: target.key, number };
  });
}

/*===== Copy =====*/
/**
 * Copies a card into another project: a new card there with the title, description, priority, due date, estimate,
 * labels (matched by name) and checklist, unticked, owned by the admin who copied it and assigned to nobody. Links are
 * copied, and files copied in the bucket first (deleted again if the copy isn't saved). Comments, time, history and
 * dependencies stay with the original. The copy's history says what it was copied from.
 *
 * @returns The copy's place; `not-found` as for a move; `invalid` for a missing or same target, or the cancelled
 * column (a card enters it only by being stopped).
 */
export async function copyTaskToProject({
  db,
  actorId,
  projectId,
  taskId,
  targetProjectId,
  columnKind,
}: TransferInput): Promise<Placed | NotFound | Invalid> {
  /*------ Files First ------*/
  // Read outside the transaction, so the bucket's copying holds no locks; the transaction reads the task again.
  const preview = await locate({ db, projectId, taskId, targetProjectId });
  if ("kind" in preview) return preview;
  const sourceKind = preview.from.kind as ColumnKind;
  const kind = columnKind ?? (sourceKind === "cancelled" || sourceKind === "custom" ? "todo" : sourceKind);
  if (kind === "cancelled") return { kind: "invalid", fields: { columnKind: m.transfer_error_cancelled() } };
  if (kind === "custom") return { kind: "invalid", fields: { columnKind: m.transfer_error_custom() } };
  const attachments = await findAttachments({ db, taskIds: [taskId] });
  const files = attachments
    .filter((item) => item.kind === "file")
    .map((item) => ({ fromId: item.id, toId: randomUUID(), preview: item.previewWidth !== null }));
  await copyFiles(files);
  const newIds = new Map(files.map((file) => [file.fromId, file.toId]));

  try {
    const result = await db.transaction(async (tx): Promise<Placed | NotFound | Invalid> => {
      const found = await locate({ db: tx, projectId, taskId, targetProjectId });
      if ("kind" in found) return found;
      const { task, target } = found;

      /*------ Card ------*/
      const to = await findColumnByKind({ db: tx, projectId: target.id, kind });
      const number = await takeTaskNumber({ db: tx, projectId: target.id });
      const position = generateKeyBetween(await findLastPosition({ db: tx, columnId: to.id }), null);
      const record = await insertTask({
        db: tx,
        values: {
          projectId: target.id,
          number,
          columnId: to.id,
          position,
          title: task.title,
          description: task.description,
          descriptionText: task.descriptionText,
          priority: task.priority,
          dueDate: task.dueDate,
          estimateMinutes: task.estimateMinutes,
          ownerId: actorId,
          createdBy: actorId,
          completedAt: kind === "done" ? new Date() : null,
        },
      });
      await replaceTaskLabels({
        db: tx,
        taskId: record.id,
        labelIds: await matchLabels({ db: tx, actorId, task, targetProjectId: target.id }),
      });

      /*------ Checklist and Attachments ------*/
      for (const item of await findChecklistItems({ db: tx, taskIds: [task.id] })) {
        await insertChecklistItem({
          db: tx,
          values: { taskId: record.id, text: item.text, position: item.position, createdBy: actorId },
        });
      }
      for (const item of attachments) {
        await insertAttachment({
          db: tx,
          values: {
            id: newIds.get(item.id),
            taskId: record.id,
            kind: item.kind,
            name: item.name,
            url: item.url,
            contentType: item.contentType,
            size: item.size,
            previewWidth: item.previewWidth,
            previewHeight: item.previewHeight,
            addedBy: actorId,
          },
        });
      }

      /*------ History ------*/
      const sourceKey = (await findProjectById({ db: tx, id: projectId }))?.key ?? "";
      const code = taskCode({ key: target.key, number });
      await recordActivity({
        db: tx,
        actorId,
        entries: [
          {
            action: "task.copied",
            projectId: target.id,
            taskId: record.id,
            before: { projectId, code: taskCode({ key: sourceKey, number: task.number }) },
            after: { code, columnId: to.id, columnKind: to.kind, columnName: to.name },
            snapshot: { code, title: record.title },
          },
        ],
      });
      return { kind: "success", projectKey: target.key, number };
    });
    if (result.kind !== "success") await discardFiles([...newIds.values()]);
    return result;
  } catch (error) {
    await discardFiles([...newIds.values()]);
    throw error;
  }
}

/*===== Old Codes =====*/
/**
 * Where a moved card is now, for a link to its old code: `TGQ-12` → `WEB-31`. Null for a code that was never moved
 * away, or a card in a project the person can't open.
 */
export async function resolveOldCode({
  db,
  actor,
  projectId,
  number,
}: {
  db: Database;
  actor: TaskActor;
  projectId: string;
  number: number;
}): Promise<{ projectKey: string; number: number } | null> {
  const found = await findAliasedTask({ db, projectId, number });
  if (!found) return null;
  if (!(await canAccessProject({ db, viewer: { id: actor.id, role: actor.role }, projectId: found.projectId }))) {
    return null;
  }
  return { projectKey: found.projectKey, number: found.number };
}
