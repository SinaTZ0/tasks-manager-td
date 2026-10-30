import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";

import type { Database } from "#/db/client.server";
import { issuesToErrorData } from "#/lib/schema-issues";
import { recordActivity } from "#/orpc/activity/service";
import { toPerson } from "#/orpc/project/mapper";
import { taskCode } from "#/orpc/task/constants";
import type { Board, Label, TaskCard, TaskDetail } from "#/orpc/task/contract";
import { toLabel, toTaskCard, toTaskDetail } from "#/orpc/task/mapper";
import {
  findActiveMemberIds,
  findColumn,
  findColumnByKind,
  findLabelByName,
  findLabelIdsByTask,
  findLabels,
  findLastPosition,
  findLiveTasks,
  findPeople,
  findProjectKey,
  findTaskByNumber,
  insertLabel,
  insertTask,
  lockTask,
  replaceTaskLabels,
  takeTaskNumber,
  updateTaskRow,
  type ColumnRow,
  type TaskRecord,
} from "#/orpc/task/repository";
import { newLabelSchema, newTaskSchema, taskChangeSchema, type TaskChange } from "#/orpc/task/validation";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string>; errors?: string[] };
type NotFound = { kind: "not-found" };

/** Who is acting: an admin may hand over any task, a member only their own. */
export type TaskActor = { id: string; role?: string | null | undefined };

/** A malformed UUID would make Postgres throw; it is treated like any unknown ID. */
const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Board =====*/
/** A project's live tasks with their labels, the project's labels, and everyone the cards name. */
export async function getBoard({ db, projectId }: { db: Database; projectId: string }): Promise<Board> {
  const [records, labels] = await Promise.all([findLiveTasks({ db, projectId }), findLabels({ db, projectId })]);
  const labelIds = await findLabelIdsByTask({ db, taskIds: records.map((record) => record.id) });
  const personIds = new Set(
    records.flatMap((record) => [record.ownerId, record.createdBy, ...(record.assigneeId ? [record.assigneeId] : [])]),
  );
  const people = await findPeople({ db, ids: [...personIds] });

  return {
    tasks: records.map((record) => toTaskCard({ record, labelIds: labelIds.get(record.id) ?? [] })),
    labels: labels.map(toLabel),
    people: people.map(toPerson),
  };
}

/*===== Get =====*/
/** A task by its number, archived ones included, so an old link still opens. */
export async function getTask({
  db,
  projectId,
  number,
}: {
  db: Database;
  projectId: string;
  number: number;
}): Promise<TaskDetail | null> {
  const record = await findTaskByNumber({ db, projectId, number });
  if (!record) return null;
  const labelIds = await findLabelIdsByTask({ db, taskIds: [record.id] });
  return toTaskDetail({ record, labelIds: labelIds.get(record.id) ?? [] });
}

/*===== References =====*/
/**
 * Checks that the people and labels a change names belong to the project: an owner or assignee must be an active
 * member, a label one of the project's.
 *
 * @returns Field messages for the ones that don't.
 */
async function checkReferences({
  db,
  projectId,
  change,
}: {
  db: Database;
  projectId: string;
  change: Pick<TaskChange, "ownerId" | "assigneeId" | "labelIds">;
}): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  const people = [change.ownerId, change.assigneeId].filter((id): id is string => !!id);
  const active = await findActiveMemberIds({ db, projectId, ids: people });
  if (change.ownerId && !active.has(change.ownerId)) fields.ownerId = m.task_error_person_unusable();
  if (change.assigneeId && !active.has(change.assigneeId)) fields.assigneeId = m.task_error_person_unusable();

  if (change.labelIds && change.labelIds.length > 0) {
    const known = new Set((await findLabels({ db, projectId })).map((row) => row.id));
    if (change.labelIds.some((id) => !known.has(id))) fields.labelIds = m.task_error_label_unknown();
  }
  return fields;
}

/** Label names for the history, which outlives a renamed label. */
async function labelNames({ db, projectId, ids }: { db: Database; projectId: string; ids: string[] }) {
  const byId = new Map((await findLabels({ db, projectId })).map((row) => [row.id, row.name]));
  return ids.map((id) => byId.get(id) ?? id);
}

/*===== Create =====*/
type CreateResult = { kind: "success"; task: TaskCard } | Invalid;

/**
 * Adds a task at the bottom of a column (the backlog when none is named), owned by whoever creates it. It takes the
 * project's next number, so its code (`TD-42`) is never reused.
 *
 * @returns `invalid` with field messages for a bad value, a column of another project or the cancelled column, or a
 * person or label the project doesn't have.
 */
export async function createTask({
  db,
  actorId,
  projectId,
  input,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  input: unknown;
}): Promise<CreateResult> {
  const parsed = newTaskSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { columnId, title, description, priority, dueDate, estimateMinutes, assigneeId, labelIds = [] } = parsed.data;

  /*------ Column ------*/
  // Stopped work lands in the cancelled column through "stop", never by being created there.
  let column: ColumnRow | undefined;
  if (columnId) {
    column = isUuid(columnId) ? await findColumn({ db, projectId, columnId }) : undefined;
    if (!column || column.kind === "cancelled") {
      return { kind: "invalid", fields: { columnId: m.task_error_column_unusable() } };
    }
  } else {
    column = await findColumnByKind({ db, projectId, kind: "backlog" });
  }

  const fields = await checkReferences({ db, projectId, change: { assigneeId, labelIds } });
  if (Object.keys(fields).length > 0) return { kind: "invalid", fields };

  return db.transaction(async (tx): Promise<CreateResult> => {
    const number = await takeTaskNumber({ db: tx, projectId });
    const position = generateKeyBetween(await findLastPosition({ db: tx, columnId: column.id }), null);
    const record = await insertTask({
      db: tx,
      values: {
        projectId,
        number,
        columnId: column.id,
        position,
        title,
        description: description?.doc ?? null,
        descriptionText: description?.text ?? "",
        priority: priority ?? "medium",
        dueDate: dueDate ?? null,
        estimateMinutes: estimateMinutes ?? null,
        ownerId: actorId,
        assigneeId: assigneeId ?? null,
        createdBy: actorId,
      },
    });
    await replaceTaskLabels({ db: tx, taskId: record.id, labelIds });

    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "task.created",
          projectId,
          taskId: record.id,
          after: { title, column: column.kind },
          snapshot: { code, title, columnName: column.name, columnKind: column.kind },
        },
      ],
    });
    return { kind: "success", task: toTaskCard({ record, labelIds }) };
  });
}

/*===== Update =====*/
type UpdateResult = { kind: "success"; task: TaskDetail } | NotFound | Invalid;

/** The fields as the history keeps them: the description as plain text, the labels by name. */
type HistoryValues = Record<string, unknown>;

/**
 * Changes a task's fields; only those the input names. Ownership passes only from the owner or an admin (rule 6), and
 * an archived task can't be edited. Every change is one history entry listing each changed field before and after.
 *
 * @returns `not-found` for a task the project doesn't have or one that is archived; `invalid` with field messages.
 */
export async function updateTask({
  db,
  actor,
  projectId,
  taskId,
  input,
}: {
  db: Database;
  actor: TaskActor;
  projectId: string;
  taskId: string;
  input: unknown;
}): Promise<UpdateResult> {
  const parsed = taskChangeSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  if (!isUuid(taskId)) return { kind: "not-found" };
  const change = parsed.data;

  const fields = await checkReferences({ db, projectId, change });
  if (Object.keys(fields).length > 0) return { kind: "invalid", fields };

  return db.transaction(async (tx): Promise<UpdateResult> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current || current.archivedAt) return { kind: "not-found" };

    if (change.ownerId && change.ownerId !== current.ownerId) {
      if (actor.role !== "admin" && actor.id !== current.ownerId) {
        return { kind: "invalid", fields: { ownerId: m.task_error_owner_only() } };
      }
    }

    /*------ Changed Fields ------*/
    const values: Partial<TaskRecord> = {};
    const before: HistoryValues = {};
    const after: HistoryValues = {};
    const note = (key: string, from: unknown, to: unknown) => {
      before[key] = from;
      after[key] = to;
    };

    if (change.title !== undefined && change.title !== current.title) {
      values.title = change.title;
      note("title", current.title, change.title);
    }
    if (change.description !== undefined) {
      const doc = change.description?.doc ?? null;
      const text = change.description?.text ?? "";
      if (JSON.stringify(doc) !== JSON.stringify(current.description ?? null)) {
        values.description = doc;
        values.descriptionText = text;
        note("description", current.descriptionText, text);
      }
    }
    for (const key of ["priority", "dueDate", "estimateMinutes", "ownerId", "assigneeId"] as const) {
      const next = change[key];
      if (next !== undefined && next !== current[key]) {
        Object.assign(values, { [key]: next });
        note(key, current[key], next);
      }
    }

    const labelIds = (await findLabelIdsByTask({ db: tx, taskIds: [taskId] })).get(taskId) ?? [];
    let nextLabelIds = labelIds;
    if (change.labelIds && change.labelIds.toSorted().join() !== labelIds.toSorted().join()) {
      nextLabelIds = change.labelIds;
      await replaceTaskLabels({ db: tx, taskId, labelIds: nextLabelIds });
      note(
        "labels",
        await labelNames({ db: tx, projectId, ids: labelIds }),
        await labelNames({ db: tx, projectId, ids: nextLabelIds }),
      );
    }

    if (Object.keys(after).length === 0) {
      return { kind: "success", task: toTaskDetail({ record: current, labelIds }) };
    }

    // Labels live in their own table; the row is still touched so `updatedAt` says when the task last changed.
    const record = await updateTaskRow({ db: tx, id: taskId, values: { ...values, updatedAt: new Date() } });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number });
    await recordActivity({
      db: tx,
      actorId: actor.id,
      entries: [{ action: "task.updated", projectId, taskId, before, after, snapshot: { code, title: record.title } }],
    });
    return { kind: "success", task: toTaskDetail({ record, labelIds: nextLabelIds }) };
  });
}

/*===== Archive =====*/
/** Takes a task off the board. Its row and history stay; it can be restored or, by an admin, deleted (rule 10). */
export async function archiveTask({
  db,
  actorId,
  projectId,
  taskId,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
}): Promise<{ kind: "ok" } | NotFound> {
  if (!isUuid(taskId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<{ kind: "ok" } | NotFound> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current) return { kind: "not-found" };
    if (current.archivedAt) return { kind: "ok" };

    await updateTaskRow({ db: tx, id: taskId, values: { archivedAt: new Date() } });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: "task.archived", projectId, taskId, snapshot: { code, title: current.title } }],
    });
    return { kind: "ok" };
  });
}

/*===== Labels =====*/
type LabelResult = { kind: "success"; label: Label } | Invalid;

/** Adds a label to the project. Any member may: tagging is everyday work. Names are unique within a project. */
export async function createLabel({
  db,
  actorId,
  projectId,
  input,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  input: unknown;
}): Promise<LabelResult> {
  const parsed = newLabelSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { name, color } = parsed.data;

  if (await findLabelByName({ db, projectId, name })) {
    return { kind: "invalid", fields: { name: m.label_error_name_taken() } };
  }

  return db.transaction(async (tx): Promise<LabelResult> => {
    const record = await insertLabel({ db: tx, values: { projectId, name, color } });
    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: "label.created", projectId, after: { name, color }, snapshot: { labelId: record.id, name } }],
    });
    return { kind: "success", label: toLabel(record) };
  });
}
