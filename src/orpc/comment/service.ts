import { z } from "zod";

import type { Database } from "#/db/client.server";
import { issuesToErrorData } from "#/lib/schema-issues";
import { mentionedIds, plainTextToRichText, type RichTextDoc } from "#/lib/rich-text";
import { recordActivity } from "#/orpc/activity/service";
import type { Comment } from "#/orpc/comment/contract";
import {
  findComments,
  insertComment,
  lockComment,
  updateComment,
  type CommentRecord,
  type CommentRow,
} from "#/orpc/comment/repository";
import { commentBodySchema } from "#/orpc/comment/validation";
import { notify } from "#/orpc/notification/service";
import { avatarUrlOf } from "#/orpc/project/mapper";
import { taskCode } from "#/orpc/task/constants";
import {
  findActiveMemberIds,
  findAssigneeIdsByTask,
  findPeople,
  findProjectKey,
  lockTask,
} from "#/orpc/task/repository";
import { findPossibleWatchers } from "#/orpc/watcher/repository";
import { autoWatch, notifyWatchers } from "#/orpc/watcher/service";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string>; errors?: string[] };
type NotFound = { kind: "not-found" };
type Saved = { kind: "success"; comment: Comment };

const isUuid = (value: string) => z.guid().safeParse(value).success;

/** How much of a comment a mention's or watcher's notification quotes. */
const EXCERPT_LENGTH = 140;

const excerptOf = (text: string) => (text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text);

/*===== Shapes =====*/
function toComment(record: CommentRow): Comment {
  const deleted = record.deletedAt !== null;
  return {
    id: record.id,
    authorId: record.authorId,
    authorName: record.authorName,
    authorAvatarUrl: avatarUrlOf(record.authorAvatarMediaId),
    body: deleted ? null : (record.body as RichTextDoc),
    createdAt: record.createdAt,
    editedAt: record.editedAt,
    deleted,
  };
}

async function withAuthorName({ db, record }: { db: Database; record: CommentRecord }) {
  const [author] = await findPeople({ db, ids: [record.authorId] });
  return toComment({ ...record, authorName: author?.name ?? "", authorAvatarMediaId: author?.avatarMediaId ?? null });
}

/*===== Mentions =====*/
/**
 * Tells the project's active members a comment mentions, leaving out `already` (those an edit's earlier text had
 * mentioned, who were told then), and makes them watch the card. A mention of someone outside the project stays in the
 * text but tells nobody.
 *
 * @returns Who was mentioned and told (the actor included, if they mentioned themselves).
 */
async function notifyMentions({
  db,
  actorId,
  projectId,
  task,
  doc,
  text,
  already = [],
}: {
  db: Database;
  actorId: string;
  projectId: string;
  task: { id: string; number: number; title: string; ownerId: string };
  doc: RichTextDoc;
  text: string;
  already?: string[];
}): Promise<Set<string>> {
  const ids = mentionedIds(doc).filter((id) => !already.includes(id));
  if (ids.length === 0) return new Set();
  const members = await findActiveMemberIds({ db, projectId, ids });
  const key = await findProjectKey({ db, projectId });
  const note = excerptOf(text);
  await notify({
    db,
    actorId,
    entries: [...members].map((userId) => ({
      userId,
      kind: "mentioned" as const,
      projectId,
      taskId: task.id,
      data: { projectKey: key, taskCode: taskCode({ key, number: task.number }), taskTitle: task.title, note },
    })),
  });
  await autoWatch({ db, projectId, task, userIds: [...members] });
  return members;
}

/*===== List =====*/
/** A task's thread, oldest first. A task the project doesn't have has none. */
export async function listComments({
  db,
  projectId,
  taskId,
}: {
  db: Database;
  projectId: string;
  taskId: string;
}): Promise<Comment[]> {
  if (!isUuid(taskId)) return [];
  return (await findComments({ db, projectId, taskId })).map(toComment);
}

/*===== Add =====*/
/**
 * Adds a comment to a live task, records it in the history, tells the project members it mentions, the card's owner
 * and assignees, and its watchers (once each: a mention is the one notification), and makes the author watch the card.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for a bad document.
 */
export async function addComment({
  db,
  actorId,
  projectId,
  taskId,
  body,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  body: unknown;
}): Promise<Saved | NotFound | Invalid> {
  const parsed = commentBodySchema.safeParse(body);
  if (!parsed.success)
    return { kind: "invalid", fields: { body: issuesToErrorData(parsed.error.issues).errors[0] ?? "" } };
  if (!isUuid(taskId)) return { kind: "not-found" };
  const { doc, text } = parsed.data;

  return db.transaction(async (tx): Promise<Saved | NotFound> => {
    const task = await lockTask({ db: tx, projectId, id: taskId });
    if (!task || task.archivedAt) return { kind: "not-found" };
    const record = await insertComment({ db: tx, values: { taskId, authorId: actorId, body: doc, bodyText: text } });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: task.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "comment.added",
          projectId,
          taskId,
          after: { commentId: record.id, text },
          snapshot: { code, title: task.title },
        },
      ],
    });
    const mentioned = await notifyMentions({ db: tx, actorId, projectId, task, doc, text });
    // The people on the card never become watchers (`autoWatch`), so they are told here, unless they left the project.
    const assignees = (await findAssigneeIdsByTask({ db: tx, taskIds: [taskId] })).get(taskId) ?? [];
    const crew = await findPossibleWatchers({ db: tx, projectId, ids: [task.ownerId, ...assignees] });
    // Told before the author starts watching; `notifyWatchers` leaves the author out anyway.
    await notifyWatchers({
      db: tx,
      actorId,
      projectId,
      task,
      event: "commented",
      note: excerptOf(text),
      also: crew,
      except: mentioned,
    });
    await autoWatch({ db: tx, projectId, task, userIds: [actorId] });
    return { kind: "success", comment: await withAuthorName({ db: tx, record }) };
  });
}

/*===== Edit =====*/
/**
 * Replaces the text of the actor's own comment and marks it edited. Someone else's comment, or a deleted one, can't be
 * edited. Only people the new text mentions for the first time are told.
 *
 * @returns `not-found` for a comment the project doesn't have or one on an archived task; `invalid` for a bad
 * document or a comment that isn't the actor's.
 */
export async function editComment({
  db,
  actorId,
  projectId,
  commentId,
  body,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  commentId: string;
  body: unknown;
}): Promise<Saved | NotFound | Invalid> {
  const parsed = commentBodySchema.safeParse(body);
  if (!parsed.success)
    return { kind: "invalid", fields: { body: issuesToErrorData(parsed.error.issues).errors[0] ?? "" } };
  if (!isUuid(commentId)) return { kind: "not-found" };
  const { doc, text } = parsed.data;

  return db.transaction(async (tx): Promise<Saved | NotFound | Invalid> => {
    const found = await lockComment({ db: tx, projectId, id: commentId });
    if (!found || found.task.archivedAt || found.comment.deletedAt) return { kind: "not-found" };
    if (found.comment.authorId !== actorId)
      return { kind: "invalid", fields: {}, errors: [m.comment_error_not_yours()] };

    const before = found.comment;
    if (JSON.stringify(before.body) === JSON.stringify(doc)) {
      return { kind: "success", comment: await withAuthorName({ db: tx, record: before }) };
    }
    const record = await updateComment({
      db: tx,
      id: commentId,
      values: { body: doc, bodyText: text, editedAt: new Date() },
    });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: found.task.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "comment.edited",
          projectId,
          taskId: found.task.id,
          before: { commentId, text: before.bodyText },
          after: { commentId, text },
          snapshot: { code, title: found.task.title },
        },
      ],
    });
    await notifyMentions({
      db: tx,
      actorId,
      projectId,
      task: found.task,
      doc,
      text,
      already: mentionedIds(before.body as RichTextDoc),
    });
    return { kind: "success", comment: await withAuthorName({ db: tx, record }) };
  });
}

/*===== Remove =====*/
/**
 * Deletes the actor's own comment softly: the thread shows that one was there, the history keeps what it said.
 * Deleting it again is a no-op.
 *
 * @returns `not-found` for a comment the project doesn't have or one on an archived task; `invalid` for someone else's.
 */
export async function removeComment({
  db,
  actorId,
  projectId,
  commentId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  commentId: string;
}): Promise<{ kind: "ok" } | NotFound | Invalid> {
  if (!isUuid(commentId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<{ kind: "ok" } | NotFound | Invalid> => {
    const found = await lockComment({ db: tx, projectId, id: commentId });
    if (!found || found.task.archivedAt) return { kind: "not-found" };
    if (found.comment.authorId !== actorId)
      return { kind: "invalid", fields: {}, errors: [m.comment_error_not_yours()] };
    if (found.comment.deletedAt) return { kind: "ok" };

    await updateComment({ db: tx, id: commentId, values: { deletedAt: new Date() } });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: found.task.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "comment.deleted",
          projectId,
          taskId: found.task.id,
          before: { commentId, text: found.comment.bodyText },
          snapshot: { code, title: found.task.title },
        },
      ],
    });
    return { kind: "ok" };
  });
}

/*===== Plain Comments =====*/
/**
 * Adds a plain-text comment to a task and records it in the history, inside the caller's transaction: a forced move's
 * reason is written this way, so the thread says why the rule was bent.
 */
export async function addPlainComment({
  db,
  actorId,
  projectId,
  task,
  code,
  text,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  task: { id: string; title: string };
  code: string;
  text: string;
}): Promise<CommentRecord> {
  const record = await insertComment({
    db,
    values: { taskId: task.id, authorId: actorId, body: plainTextToRichText(text), bodyText: text },
  });
  await recordActivity({
    db,
    actorId,
    entries: [
      {
        action: "comment.added",
        projectId,
        taskId: task.id,
        after: { commentId: record.id, text },
        snapshot: { code, title: task.title },
      },
    ],
  });
  return record;
}
