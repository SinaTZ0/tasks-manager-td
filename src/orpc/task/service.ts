import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";

import type { Database } from "#/db/client.server";
import { isPositionKey, resolvePosition } from "#/lib/position";
import { issuesToErrorData } from "#/lib/schema-issues";
import type { ActivityAction } from "#/orpc/activity/constants";
import { findTaskActivities } from "#/orpc/activity/repository";
import { recordActivity } from "#/orpc/activity/service";
import { addPlainComment } from "#/orpc/comment/service";
import { getHandoffs } from "#/orpc/delegation/service";
import { findBlockingTasks, findReleasedDependents, findWaitsFor } from "#/orpc/dependency/repository";
import { notify, type NotificationEntry } from "#/orpc/notification/service";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Person } from "#/orpc/project/contract";
import { toPerson } from "#/orpc/project/mapper";
import {
  BLOCKED_ENTRY_KINDS,
  canTakeAction,
  RELEASED_KINDS,
  STATUS_ACTION_RULES,
  taskCode,
  type TaskStatusAction,
} from "#/orpc/task/constants";
import type { ArchivedTask, Board, Label, TaskCard, TaskDetail } from "#/orpc/task/contract";
import { toLabel, toTaskCard, toTaskDetail } from "#/orpc/task/mapper";
import {
  deleteTaskRow,
  findActiveMemberIds,
  findArchivedTasks,
  findColumn,
  findColumnByKind,
  findColumnPositions,
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
import {
  forceCommentSchema,
  newLabelSchema,
  newTaskSchema,
  statusReasonSchema,
  taskChangeSchema,
  type TaskChange,
} from "#/orpc/task/validation";
import { findTimeTotals } from "#/orpc/time/repository";
import { closeTimers, startTimer } from "#/orpc/time/service";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
type Invalid = { kind: "invalid"; fields: Record<string, string>; errors?: string[] };
type NotFound = { kind: "not-found" };
/** A move into doing or done refused because the task still waits for these (rule 4). */
type Blocked = { kind: "blocked"; blockerIds: string[] };

/** Who is acting: an admin may hand over any task, a member only their own. */
export type TaskActor = { id: string; role?: string | null | undefined };

/** A malformed UUID would make Postgres throw; it is treated like any unknown ID. */
const isUuid = (value: string) => z.guid().safeParse(value).success;

/*===== Cards =====*/
/** Task rows as cards, with their labels and time. */
async function toCards({ db, records }: { db: Database; records: TaskRecord[] }): Promise<TaskCard[]> {
  // One after the other: inside a transaction both would share one connection, which runs one query at a time.
  const taskIds = records.map((record) => record.id);
  const labelIds = await findLabelIdsByTask({ db, taskIds });
  const totals = await findTimeTotals({ db, taskIds });
  const waitsFor = await findWaitsFor({ db, taskIds });
  return records.map((record) =>
    toTaskCard({
      record,
      labelIds: labelIds.get(record.id) ?? [],
      time: totals.get(record.id),
      waitsFor: waitsFor.get(record.id) ?? [],
    }),
  );
}

async function toCard({ db, record }: { db: Database; record: TaskRecord }): Promise<TaskCard> {
  const [card] = await toCards({ db, records: [record] });
  if (!card) throw new Error("toCard: no card for the record");
  return card;
}

/** The history entries that put a task in a column; the last one says how it got where it is. */
const COLUMN_ENTRIES: readonly ActivityAction[] = [
  "task.moved",
  "task.started",
  "task.paused",
  "task.completed",
  "task.stopped",
  "task.reopened",
];

/**
 * A task row as its drawer shows it. A task paused or stopped by its action carries that action's reason; one dragged
 * into the paused column has none.
 */
async function toDetail({
  db,
  projectId,
  record,
}: {
  db: Database;
  projectId: string;
  record: TaskRecord;
}): Promise<TaskDetail> {
  const labelIds = await findLabelIdsByTask({ db, taskIds: [record.id] });
  const totals = await findTimeTotals({ db, taskIds: [record.id] });
  const waitsFor = await findWaitsFor({ db, taskIds: [record.id] });
  const column = await findColumn({ db, projectId, columnId: record.columnId });
  const entries = await findTaskActivities({ db, taskId: record.id, actions: COLUMN_ENTRIES });
  const handoffs = await getHandoffs({ db, taskId: record.id });
  const last = entries.at(-1);
  const noted =
    (column?.kind === "paused" && last?.action === "task.paused") ||
    (column?.kind === "cancelled" && last?.action === "task.stopped");
  const statusNote =
    noted && last
      ? {
          action: last.action === "task.paused" ? ("pause" as const) : ("stop" as const),
          reason: ((last.after ?? {}) as { reason?: string | null }).reason ?? null,
          actorId: last.actorId,
          at: last.createdAt,
        }
      : null;
  return toTaskDetail({
    record,
    labelIds: labelIds.get(record.id) ?? [],
    time: totals.get(record.id),
    waitsFor: waitsFor.get(record.id) ?? [],
    statusNote,
    handoffs,
  });
}

/*===== Column Effects =====*/
const isReleased = (kind: string | undefined) => (RELEASED_KINDS as readonly string[]).includes(kind ?? "");

/**
 * Records "unblocked" on each task that `blocker` was the last to hold up, as it is done, cancelled or archived, and
 * tells each waiting task's owner (docs/app.md → Dependency). Asked before the blocker moves.
 */
async function releaseDependents({
  db,
  actorId,
  blocker,
}: {
  db: Database;
  actorId: string;
  blocker: TaskRecord;
}): Promise<void> {
  const released = await findReleasedDependents({ db, blockerId: blocker.id });
  if (released.length === 0) return;
  const key = await findProjectKey({ db, projectId: blocker.projectId });
  const blockerCode = taskCode({ key, number: blocker.number });
  await recordActivity({
    db,
    actorId,
    entries: released.map((dependent) => ({
      action: "task.unblocked",
      projectId: blocker.projectId,
      taskId: dependent.id,
      after: { blockerId: blocker.id, blockerCode, ownerId: dependent.ownerId },
      snapshot: { code: taskCode({ key, number: dependent.number }), title: dependent.title },
    })),
  });
  await notify({
    db,
    actorId,
    entries: released.map((dependent) => ({
      userId: dependent.ownerId,
      kind: "unblocked",
      projectId: blocker.projectId,
      taskId: dependent.id,
      data: {
        projectKey: key,
        taskCode: taskCode({ key, number: dependent.number }),
        taskTitle: dependent.title,
        note: blockerCode,
      },
    })),
  });
}

/**
 * What a task's change of column kind does besides moving it: leaving doing stops every timer on it (rule 3), entering
 * done records when it finished and leaving done clears that, and entering done or cancelled releases the tasks it was
 * the last to hold up. Runs in the move's transaction, before the row changes.
 *
 * @returns The task fields to write with the move.
 */
async function columnEffects({
  db,
  actorId,
  task,
  from,
  to,
}: {
  db: Database;
  actorId: string;
  task: TaskRecord;
  from: string | undefined;
  to: ColumnKind;
}): Promise<Partial<TaskRecord>> {
  if (from === to) return {};
  if (from === "doing") await closeTimers({ db, actorId, scope: { taskId: task.id }, cause: "left-doing" });
  if (isReleased(to) && !isReleased(from)) await releaseDependents({ db, actorId, blocker: task });
  if (to === "done") return { completedAt: new Date() };
  if (from === "done") return { completedAt: null };
  return {};
}

/*===== Blocked Gate =====*/
/**
 * Rule 4: a task that still waits for others can't enter doing or done, unless the person forces it and says why. The
 * reason is written as a comment on the task, so the thread shows the rule was bent and by whom.
 *
 * @returns `pass` (with the forcing comment's id when one was written), `blocked` with what it waits for, or `invalid`
 * for an empty or too long comment.
 */
async function passBlockedGate({
  db,
  actorId,
  task,
  from,
  to,
  forceComment,
}: {
  db: Database;
  actorId: string;
  task: TaskRecord;
  from: string | undefined;
  to: ColumnKind;
  forceComment: string | undefined;
}): Promise<{ kind: "pass"; commentId?: string } | Blocked | Invalid> {
  if (from === to || !(BLOCKED_ENTRY_KINDS as readonly string[]).includes(to)) return { kind: "pass" };
  const blockers = await findBlockingTasks({ db, taskId: task.id });
  if (blockers.length === 0) return { kind: "pass" };
  if (forceComment === undefined) return { kind: "blocked", blockerIds: blockers.map((blocker) => blocker.id) };

  const parsed = forceCommentSchema.safeParse(forceComment);
  if (!parsed.success) return { kind: "invalid", fields: { forceComment: parsed.error.issues[0]?.message ?? "" } };
  const code = taskCode({ key: await findProjectKey({ db, projectId: task.projectId }), number: task.number });
  const comment = await addPlainComment({ db, actorId, projectId: task.projectId, task, code, text: parsed.data });
  return { kind: "pass", commentId: comment.id };
}

/*===== Board =====*/
/** A project's live tasks with their labels and time, the project's labels, and everyone the cards name. */
export async function getBoard({ db, projectId }: { db: Database; projectId: string }): Promise<Board> {
  const [records, labels] = await Promise.all([findLiveTasks({ db, projectId }), findLabels({ db, projectId })]);
  const personIds = new Set(
    records.flatMap((record) => [record.ownerId, record.createdBy, ...(record.assigneeId ? [record.assigneeId] : [])]),
  );
  const people = await findPeople({ db, ids: [...personIds] });

  return {
    tasks: await toCards({ db, records }),
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
  return toDetail({ db, projectId, record });
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

/*===== Assigned =====*/
/** "Assigned to you": what the task's new assignee is told (nobody, when they assigned themselves). */
function assignedEntry({
  record,
  projectId,
  key,
}: {
  record: TaskRecord;
  projectId: string;
  key: string;
}): NotificationEntry {
  if (!record.assigneeId) throw new Error("assignedEntry: the task has no assignee");
  return {
    userId: record.assigneeId,
    kind: "assigned",
    projectId,
    taskId: record.id,
    data: { projectKey: key, taskCode: taskCode({ key, number: record.number }), taskTitle: record.title },
  };
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

    const key = await findProjectKey({ db: tx, projectId });
    const code = taskCode({ key, number });
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
    if (record.assigneeId) {
      await notify({ db: tx, actorId, entries: [assignedEntry({ record, projectId, key })] });
    }
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
      return { kind: "success", task: await toDetail({ db: tx, projectId, record: current }) };
    }

    // Labels live in their own table; the row is still touched so `updatedAt` says when the task last changed.
    const record = await updateTaskRow({ db: tx, id: taskId, values: { ...values, updatedAt: new Date() } });
    const key = await findProjectKey({ db: tx, projectId });
    const code = taskCode({ key, number: current.number });
    await recordActivity({
      db: tx,
      actorId: actor.id,
      entries: [{ action: "task.updated", projectId, taskId, before, after, snapshot: { code, title: record.title } }],
    });
    if (values.assigneeId) {
      await notify({ db: tx, actorId: actor.id, entries: [assignedEntry({ record, projectId, key })] });
    }
    return { kind: "success", task: await toDetail({ db: tx, projectId, record }) };
  });
}

/*===== Move =====*/
type MoveResult = { kind: "success"; task: TaskCard } | NotFound | Invalid | Blocked;

/**
 * Puts a card in a column at a position: dragged on the board or sent with "move to…". The board computes the key
 * between the card's new neighbours for its optimistic move; if another card took that key meanwhile, the card gets a
 * fresh one just after it, and the board's refetch shows where it landed. A move between columns is what the history's
 * "time in each column" is summed from, so its entry keeps both columns' kinds and names.
 *
 * A task that still waits for others enters doing or done only with `forceComment` (rule 4, `passBlockedGate`).
 *
 * @returns `invalid` for a key the board couldn't have made or a column that isn't on the board; `not-found` for a
 * task the project doesn't have or one that is archived; `blocked` for a blocked task's move without a comment.
 */
export async function moveTask({
  db,
  actorId,
  projectId,
  taskId,
  columnId,
  position,
  forceComment,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  columnId: string;
  position: string;
  forceComment?: string | undefined;
}): Promise<MoveResult> {
  if (!isPositionKey(position)) return { kind: "invalid", fields: { position: m.task_error_position_invalid() } };
  if (!isUuid(taskId)) return { kind: "not-found" };
  const column = isUuid(columnId) ? await findColumn({ db, projectId, columnId }) : undefined;
  // Cancelling is "stop", with its reason; a drag never does it.
  if (!column || column.kind === "cancelled") {
    return { kind: "invalid", fields: { columnId: m.task_error_column_unusable() } };
  }

  return db.transaction(async (tx): Promise<MoveResult> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current || current.archivedAt) return { kind: "not-found" };

    const taken = await findColumnPositions({ db: tx, columnId, exceptId: taskId });
    const finalPosition = resolvePosition({ wanted: position, taken });
    if (current.columnId === columnId && current.position === finalPosition) {
      return { kind: "success", task: await toCard({ db: tx, record: current }) };
    }

    const from =
      current.columnId === columnId ? column : await findColumn({ db: tx, projectId, columnId: current.columnId });
    const to = column.kind as ColumnKind;
    const gate = await passBlockedGate({ db: tx, actorId, task: current, from: from?.kind, to, forceComment });
    if (gate.kind !== "pass") return gate;
    const effects = await columnEffects({ db: tx, actorId, task: current, from: from?.kind, to });
    const record = await updateTaskRow({
      db: tx,
      id: taskId,
      values: { columnId, position: finalPosition, ...effects },
    });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: current.columnId === columnId ? "task.reordered" : "task.moved",
          projectId,
          taskId,
          before: { columnId: current.columnId, columnKind: from?.kind, columnName: from?.name ?? null },
          after: {
            columnId,
            columnKind: column.kind,
            columnName: column.name,
            ...(gate.commentId ? { forced: true, commentId: gate.commentId } : {}),
          },
          snapshot: { code, title: current.title },
        },
      ],
    });
    return { kind: "success", task: await toCard({ db: tx, record }) };
  });
}

/*===== Status =====*/
type TransitionResult = { kind: "success"; task: TaskCard } | NotFound | Invalid | Blocked;

const STATUS_ENTRY = {
  start: "task.started",
  pause: "task.paused",
  done: "task.completed",
  stop: "task.stopped",
  reopen: "task.reopened",
} as const satisfies Record<TaskStatusAction, ActivityAction>;

/**
 * Takes a status action (docs/app.md → Status / Pause / Stop): moves the task to the bottom of the action's column,
 * with what that move does to its timers and finish time (`columnEffects`), and for start (or resume) starts the
 * actor's timer on it, stopping any other they had running (rule 2). Stopping needs a reason; a pause may have one
 * (rule 5). Starting a task already in doing only starts the actor's timer. A task that still waits for others
 * starts or finishes only with `forceComment` (rule 4).
 *
 * @returns `invalid` for a missing or too long reason, or an action the task's column doesn't allow (someone moved it
 * meanwhile); `not-found` for a task the project doesn't have or one that is archived; `blocked` without a comment.
 */
export async function transitionTask({
  db,
  actorId,
  projectId,
  taskId,
  action,
  reason: rawReason,
  forceComment,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  taskId: string;
  action: TaskStatusAction;
  reason?: string | undefined;
  forceComment?: string | undefined;
}): Promise<TransitionResult> {
  const parsedReason = statusReasonSchema.safeParse(rawReason);
  if (!parsedReason.success) return { kind: "invalid", fields: issuesToErrorData(parsedReason.error.issues).fields };
  const reason = action === "pause" || action === "stop" ? parsedReason.data : null;
  if (action === "stop" && !reason) return { kind: "invalid", fields: { reason: m.task_error_reason_required() } };
  if (!isUuid(taskId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<TransitionResult> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current || current.archivedAt) return { kind: "not-found" };
    const from = await findColumn({ db: tx, projectId, columnId: current.columnId });
    if (!from || !canTakeAction({ action, kind: from.kind as ColumnKind })) {
      return { kind: "invalid", fields: { action: m.task_error_action_unavailable() } };
    }

    /*------ Move ------*/
    const to = await findColumnByKind({ db: tx, projectId, kind: STATUS_ACTION_RULES[action].to });
    let record = current;
    if (to.id !== from.id) {
      const kind = to.kind as ColumnKind;
      const gate = await passBlockedGate({ db: tx, actorId, task: current, from: from.kind, to: kind, forceComment });
      if (gate.kind !== "pass") return gate;
      const effects = await columnEffects({ db: tx, actorId, task: current, from: from.kind, to: kind });
      const position = generateKeyBetween(await findLastPosition({ db: tx, columnId: to.id }), null);
      record = await updateTaskRow({ db: tx, id: taskId, values: { columnId: to.id, position, ...effects } });
      await recordActivity({
        db: tx,
        actorId,
        entries: [
          {
            action: STATUS_ENTRY[action],
            projectId,
            taskId,
            before: { columnId: from.id, columnKind: from.kind, columnName: from.name },
            after: {
              columnId: to.id,
              columnKind: to.kind,
              columnName: to.name,
              ...(reason ? { reason } : {}),
              ...(gate.commentId ? { forced: true, commentId: gate.commentId } : {}),
            },
            snapshot: {
              code: taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number }),
              title: current.title,
            },
          },
        ],
      });
    }

    /*------ Timer ------*/
    if (action === "start") await startTimer({ db: tx, actorId, task: record });
    return { kind: "success", task: await toCard({ db: tx, record }) };
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

    await closeTimers({ db: tx, actorId, scope: { taskId }, cause: "archived" });
    // An archived task holds nothing up any more.
    const column = await findColumn({ db: tx, projectId, columnId: current.columnId });
    if (!isReleased(column?.kind)) await releaseDependents({ db: tx, actorId, blocker: current });
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

/*===== Archive List =====*/
/** A project's archived tasks as cards, most recently archived first, with when each was archived and who they name. */
export async function listArchivedTasks({
  db,
  projectId,
}: {
  db: Database;
  projectId: string;
}): Promise<{ tasks: ArchivedTask[]; people: Person[] }> {
  const records = await findArchivedTasks({ db, projectId });
  const cards = await toCards({ db, records });
  const people = await findPeople({
    db,
    ids: [...new Set(records.flatMap((record) => [record.ownerId, ...(record.assigneeId ? [record.assigneeId] : [])]))],
  });
  return {
    tasks: cards.map((card, index) => ({ ...card, archivedAt: records[index]?.archivedAt ?? new Date(0) })),
    people: people.map(toPerson),
  };
}

/*===== Restore =====*/
/**
 * Puts an archived task back on the board, at the bottom of the column it was in (docs/app.md → Archive & restore).
 * Any member may, as any member may archive one. If it is in a column that holds others up, its dependents wait for it
 * again: being blocked is worked out from the board, not stored.
 *
 * @returns `not-found` for a task the project doesn't have; restoring a live task is a no-op.
 */
export async function restoreTask({
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
    if (!current.archivedAt) return { kind: "ok" };

    const position = generateKeyBetween(await findLastPosition({ db: tx, columnId: current.columnId }), null);
    await updateTaskRow({ db: tx, id: taskId, values: { archivedAt: null, position, updatedAt: new Date() } });
    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number });
    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: "task.restored", projectId, taskId, snapshot: { code, title: current.title } }],
    });
    return { kind: "ok" };
  });
}

/*===== Delete =====*/
/**
 * Deletes an archived task for good: only an admin, and only from the archive (rule 10). Its comments, time logs,
 * links, hand-offs and notifications go with it; its history stays, with one more entry saying it was deleted, since
 * the history is never edited (rule 7). The code (`TD-42`) is never handed out again.
 *
 * @returns `not-found` for a task the project doesn't have; `invalid` for a live task or an actor who isn't an admin.
 */
export async function deleteTask({
  db,
  actor,
  projectId,
  taskId,
}: {
  db: Database;
  actor: TaskActor;
  projectId: string;
  taskId: string;
}): Promise<{ kind: "ok" } | NotFound | Invalid> {
  if (!isUuid(taskId)) return { kind: "not-found" };
  if (actor.role !== "admin") return { kind: "invalid", fields: {}, errors: [m.task_error_delete_admin_only()] };

  return db.transaction(async (tx): Promise<{ kind: "ok" } | NotFound | Invalid> => {
    const current = await lockTask({ db: tx, projectId, id: taskId });
    if (!current) return { kind: "not-found" };
    if (!current.archivedAt) return { kind: "invalid", fields: {}, errors: [m.task_error_delete_archived_only()] };

    const code = taskCode({ key: await findProjectKey({ db: tx, projectId }), number: current.number });
    await recordActivity({
      db: tx,
      actorId: actor.id,
      entries: [{ action: "task.deleted", projectId, taskId, snapshot: { code, title: current.title } }],
    });
    await deleteTaskRow({ db: tx, id: taskId });
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
