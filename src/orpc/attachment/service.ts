import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { Database } from "#/db/client.server";
import { normalizePersianText } from "#/lib/persian-text";
import type { ActivityAction } from "#/orpc/activity/constants";
import { recordActivity } from "#/orpc/activity/service";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_TASK,
  ATTACHMENT_NAME_MAX_LENGTH,
  ATTACHMENT_URL_MAX_LENGTH,
} from "#/orpc/attachment/constants";
import type { Attachment } from "#/orpc/attachment/contract";
import { discardFiles, storeFile } from "#/orpc/attachment/files.server";
import { toAttachment } from "#/orpc/attachment/mapper";
import {
  countAttachments,
  deleteAttachment,
  insertAttachment,
  lockAttachment,
  type AttachmentRecord,
} from "#/orpc/attachment/repository";
import { taskCode } from "#/orpc/task/constants";
import { findProjectKey, lockTask, type TaskRecord } from "#/orpc/task/repository";
import type { TaskActor } from "#/orpc/task/service";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string>; errors?: string[] };
type NotFound = { kind: "not-found" };
type Saved = { kind: "success"; attachment: Attachment };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== History =====*/
async function recordAttachment({
  db,
  actorId,
  projectId,
  task,
  action,
  record,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  task: TaskRecord;
  action: Extract<ActivityAction, `attachment.${string}`>;
  record: AttachmentRecord;
}): Promise<void> {
  const code = taskCode({ key: await findProjectKey({ db, projectId }), number: task.number });
  const detail = { attachmentId: record.id, kind: record.kind, name: record.name };
  await recordActivity({
    db,
    actorId,
    entries: [
      {
        action,
        projectId,
        taskId: task.id,
        ...(action === "attachment.removed" ? { before: detail } : { after: detail }),
        snapshot: { code, title: task.title },
      },
    ],
  });
}

/**
 * Locks a live task of the project and checks it can take one more attachment.
 *
 * @returns The task, `not-found`, or `invalid` when it already has `ATTACHMENT_MAX_PER_TASK`.
 */
async function lockForAdding({
  db,
  projectId,
  taskId,
  field,
}: {
  db: Database;
  projectId: string;
  taskId: string;
  field: string;
}): Promise<TaskRecord | NotFound | Invalid> {
  const task = await lockTask({ db, projectId, id: taskId });
  if (!task || task.archivedAt) return { kind: "not-found" };
  const counts = await countAttachments({ db, taskIds: [taskId] });
  if ((counts.get(taskId) ?? 0) >= ATTACHMENT_MAX_PER_TASK) {
    return { kind: "invalid", fields: { [field]: m.attachment_error_full({ max: ATTACHMENT_MAX_PER_TASK }) } };
  }
  return task;
}

/*===== Add File =====*/
/**
 * Uploads a file to a live task: the bucket first, then the row and its history entry in one transaction. If the
 * transaction doesn't save it (the task was archived meanwhile, or is full), the files are deleted again.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for a file over
 * `ATTACHMENT_MAX_BYTES`, an empty one, or a task already holding `ATTACHMENT_MAX_PER_TASK`.
 * @throws When the bucket or the database fails; the files written are deleted first.
 */
export async function addFileAttachment({
  db,
  actorId,
  projectId,
  taskId,
  file,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  file: File;
}): Promise<Saved | NotFound | Invalid> {
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return {
      kind: "invalid",
      fields: { file: m.attachment_error_too_big({ max: ATTACHMENT_MAX_BYTES / 1024 / 1024 }) },
    };
  }
  if (file.size === 0) return { kind: "invalid", fields: { file: m.attachment_error_empty() } };
  if (!isUuid(taskId)) return { kind: "not-found" };

  // Checked before the upload too, so a refused file never reaches the bucket; the transaction checks again.
  const precheck = await db.transaction((tx) => lockForAdding({ db: tx, projectId, taskId, field: "file" }));
  if ("kind" in precheck) return precheck;

  const id = randomUUID();
  const stored = await storeFile({ id, file });
  try {
    const result = await db.transaction(async (tx): Promise<Saved | NotFound | Invalid> => {
      const task = await lockForAdding({ db: tx, projectId, taskId, field: "file" });
      if ("kind" in task) return task;
      const record = await insertAttachment({
        db: tx,
        values: {
          id,
          taskId,
          kind: "file",
          name: stored.name,
          contentType: stored.contentType,
          size: stored.size,
          previewWidth: stored.preview?.width ?? null,
          previewHeight: stored.preview?.height ?? null,
          addedBy: actorId,
        },
      });
      await recordAttachment({ db: tx, actorId, projectId, task, action: "attachment.added", record });
      return { kind: "success", attachment: toAttachment(record) };
    });
    if (result.kind !== "success") await discardFiles([id]);
    return result;
  } catch (error) {
    await discardFiles([id]);
    throw error;
  }
}

/*===== Add Link =====*/
/** The link's address if it is an http(s) URL short enough to keep, normalized by the URL parser. */
function parseLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > ATTACHMENT_URL_MAX_LENGTH || !URL.canParse(trimmed)) return null;
  const url = new URL(trimmed);
  return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
}

/**
 * Adds a link to a live task, titled by `title` or, without one, by its address.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for an address that isn't
 * http(s), a title over `ATTACHMENT_NAME_MAX_LENGTH`, or a full task.
 */
export async function addLinkAttachment({
  db,
  actorId,
  projectId,
  taskId,
  url,
  title,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  url: string;
  title?: string | undefined;
}): Promise<Saved | NotFound | Invalid> {
  const address = parseLink(url);
  if (!address) return { kind: "invalid", fields: { url: m.attachment_error_url() } };
  const name = normalizePersianText(title ?? "");
  if (name.length > ATTACHMENT_NAME_MAX_LENGTH) {
    return {
      kind: "invalid",
      fields: { title: m.attachment_error_title_too_long({ max: ATTACHMENT_NAME_MAX_LENGTH }) },
    };
  }
  if (!isUuid(taskId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<Saved | NotFound | Invalid> => {
    const task = await lockForAdding({ db: tx, projectId, taskId, field: "url" });
    if ("kind" in task) return task;
    const record = await insertAttachment({
      db: tx,
      values: { taskId, kind: "link", name: name || address, url: address, addedBy: actorId },
    });
    await recordAttachment({ db: tx, actorId, projectId, task, action: "attachment.added", record });
    return { kind: "success", attachment: toAttachment(record) };
  });
}

/*===== Remove =====*/
/**
 * Removes an attachment: the row and its history entry in one transaction, then its files. Only whoever added it, or
 * an admin, may.
 *
 * @returns `not-found` for an attachment the project doesn't have or one on an archived task; `invalid` when the
 * actor neither added it nor is an admin.
 */
export async function removeAttachment({
  db,
  actor,
  projectId,
  attachmentId,
}: {
  db: Database;
  actor: TaskActor;
  projectId: string;
  attachmentId: string;
}): Promise<{ kind: "ok" } | NotFound | Invalid> {
  if (!isUuid(attachmentId)) return { kind: "not-found" };

  const result = await db.transaction(async (tx): Promise<{ kind: "ok"; file: boolean } | NotFound | Invalid> => {
    const found = await lockAttachment({ db: tx, projectId, id: attachmentId });
    if (!found) return { kind: "not-found" };
    if (found.attachment.addedBy !== actor.id && actor.role !== "admin") {
      return { kind: "invalid", fields: {}, errors: [m.attachment_error_not_yours()] };
    }
    await deleteAttachment({ db: tx, id: attachmentId });
    await recordAttachment({
      db: tx,
      actorId: actor.id,
      projectId,
      task: found.task,
      action: "attachment.removed",
      record: found.attachment,
    });
    return { kind: "ok", file: found.attachment.kind === "file" };
  });
  if (result.kind !== "ok") return result;
  if (result.file) await discardFiles([attachmentId]);
  return { kind: "ok" };
}
