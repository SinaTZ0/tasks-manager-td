import { z } from "zod";

import type { Database } from "#/db/client.server";
import { oneOf } from "#/orpc/allowed-values";
import { recordActivity } from "#/orpc/activity/service";
import type { DelegatedTask, Handoff } from "#/orpc/delegation/contract";
import { findDelegatedBy, findHandoffs, insertDelegation, type HandoffRow } from "#/orpc/delegation/repository";
import { delegationNoteSchema } from "#/orpc/delegation/validation";
import { notify } from "#/orpc/notification/service";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { TASK_PRIORITIES, taskCode } from "#/orpc/task/constants";
import { findActiveMemberIds, findProjectKey, lockTask, updateTaskRow } from "#/orpc/task/repository";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Result = { kind: "ok" } | { kind: "not-found" } | { kind: "invalid"; fields: Record<string, string> };

const isUuid = (value: string) => z.guid().safeParse(value).success;

export const toHandoff = (row: HandoffRow): Handoff => ({
  id: row.id,
  fromName: row.fromName,
  toName: row.toName,
  note: row.note,
  at: row.createdAt,
});

/*===== Delegate =====*/
/**
 * "You do this now" (docs/app.md → Assign & Delegate): makes another active member the task's assignee, keeps the
 * hand-off with its note, and tells the new assignee. The owner never changes (rule 6), so they still find the task on
 * their "delegated by me" page. Delegation is accepted at once: there is nothing for the new assignee to confirm. Any
 * member of the project may hand a task on, like assigning it.
 *
 * @returns `not-found` for a task the project doesn't have or an archived one; `invalid` for a person who can't take
 * it or already has it, or a note too long.
 */
export async function delegateTask({
  db,
  actorId,
  projectId,
  taskId,
  toId,
  note: rawNote,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  toId: string;
  note?: string | undefined;
}): Promise<Result> {
  const parsed = delegationNoteSchema.safeParse(rawNote);
  if (!parsed.success) return { kind: "invalid", fields: { note: parsed.error.issues[0]?.message ?? "" } };
  const note = parsed.data;
  if (!isUuid(taskId)) return { kind: "not-found" };
  const active = await findActiveMemberIds({ db, projectId, ids: [toId] });
  if (!active.has(toId)) return { kind: "invalid", fields: { toId: m.task_error_person_unusable() } };

  return db.transaction(async (tx): Promise<Result> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current || current.archivedAt) return { kind: "not-found" };
    if (current.assigneeId === toId)
      return { kind: "invalid", fields: { toId: m.delegation_error_already_assigned() } };

    const record = await updateTaskRow({ db: tx, id: taskId, values: { assigneeId: toId, updatedAt: new Date() } });
    await insertDelegation({
      db: tx,
      values: { taskId, fromId: actorId, toId, previousAssigneeId: current.assigneeId, note },
    });

    const key = await findProjectKey({ db: tx, projectId });
    const code = taskCode({ key, number: record.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "task.delegated",
          projectId,
          taskId,
          before: { assigneeId: current.assigneeId },
          after: { assigneeId: toId, note },
          snapshot: { code, title: record.title },
        },
      ],
    });
    await notify({
      db: tx,
      actorId,
      entries: [
        {
          userId: toId,
          kind: "delegated",
          projectId,
          taskId,
          data: { projectKey: key, taskCode: code, taskTitle: record.title, note },
        },
      ],
    });
    return { kind: "ok" };
  });
}

/*===== Chain =====*/
/** A task's hand-offs, oldest first: its chain (Sina → Ali → Reza). */
export async function getHandoffs({ db, taskId }: { db: Database; taskId: string }): Promise<Handoff[]> {
  return (await findHandoffs({ db, taskIds: [taskId] })).map(toHandoff);
}

/*===== Delegated By Me =====*/
/** The tasks the person handed on, or owns and someone handed on, that someone else has now; latest hand-off first. */
export async function listDelegatedBy({
  db,
  user,
}: {
  db: Database;
  user: { id: string; role?: string | null | undefined };
}): Promise<DelegatedTask[]> {
  const rows = await findDelegatedBy({ db, userId: user.id, admin: user.role === "admin" });
  const handoffs = await findHandoffs({ db, taskIds: rows.map((row) => row.id) });
  // Oldest first, so the last one seen for a task is its latest.
  const last = new Map(handoffs.map((row) => [row.taskId, row]));

  return rows
    .flatMap((row) => {
      const latest = last.get(row.id);
      if (!latest) return [];
      return [
        {
          id: row.id,
          projectKey: row.projectKey,
          projectName: row.projectName,
          number: row.number,
          title: row.title,
          priority: oneOf({ allowed: TASK_PRIORITIES, value: row.priority, what: "task priority" }),
          dueDate: row.dueDate,
          columnKind: oneOf({ allowed: COLUMN_KINDS, value: row.columnKind, what: "column kind" }),
          columnName: row.columnName,
          assigneeName: row.assigneeName,
          owned: row.ownerId === user.id,
          last: toHandoff(latest),
        },
      ];
    })
    .toSorted((a, b) => b.last.at.getTime() - a.last.at.getTime());
}
