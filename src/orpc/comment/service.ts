import type { Database } from "#/db/client.server";
import { plainTextToRichText } from "#/lib/rich-text";
import { recordActivity } from "#/orpc/activity/service";
import type { CommentRecord } from "#/orpc/comment/repository";
import { insertComment } from "#/orpc/comment/repository";

/*===== Comments =====*/
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
