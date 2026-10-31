import { and, asc, desc, eq, exists, inArray, isNotNull, isNull, ne, notInArray, sql, type SQL } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { boardColumn, label, project, projectMember, task, taskAssignee, taskLabel, user } from "#/db/schema";
import { EDITOR_ROLES } from "#/lib/user-constants";

/*===== Types =====*/
export type TaskRecord = typeof task.$inferSelect;
type NewTaskRecord = typeof task.$inferInsert;
export type LabelRecord = typeof label.$inferSelect;
export type ColumnRow = { id: string; kind: string; name: string | null };
export type PersonRow = { id: string; name: string; role: string; status: string; avatarMediaId: string | null };

/*===== Projects and Columns =====*/
export async function findProjectKey({ db, projectId }: { db: Database; projectId: string }): Promise<string> {
  const [row] = await db.select({ key: project.key }).from(project).where(eq(project.id, projectId)).limit(1);
  if (!row) throw new Error("findProjectKey: project not found");
  return row.key;
}

/** Hands out the project's next task number. The row lock makes concurrent creates take turns. */
export async function takeTaskNumber({ db, projectId }: { db: Database; projectId: string }): Promise<number> {
  const [row] = await db
    .update(project)
    .set({ taskCounter: sql`${project.taskCounter} + 1` })
    .where(eq(project.id, projectId))
    .returning({ number: project.taskCounter });
  if (!row) throw new Error("takeTaskNumber: project not found");
  return row.number;
}

export async function findColumn({
  db,
  projectId,
  columnId,
}: {
  db: Database;
  projectId: string;
  columnId: string;
}): Promise<ColumnRow | undefined> {
  const [row] = await db
    .select({ id: boardColumn.id, kind: boardColumn.kind, name: boardColumn.name })
    .from(boardColumn)
    .where(and(eq(boardColumn.id, columnId), eq(boardColumn.projectId, projectId)))
    .limit(1);
  return row;
}

export async function findColumnByKind({
  db,
  projectId,
  kind,
}: {
  db: Database;
  projectId: string;
  kind: string;
}): Promise<ColumnRow> {
  const [row] = await db
    .select({ id: boardColumn.id, kind: boardColumn.kind, name: boardColumn.name })
    .from(boardColumn)
    .where(and(eq(boardColumn.projectId, projectId), eq(boardColumn.kind, kind)))
    .limit(1);
  if (!row) throw new Error(`findColumnByKind: project ${projectId} has no ${kind} column`);
  return row;
}

/** The last position in a column, to put a new card under it. */
export async function findLastPosition({ db, columnId }: { db: Database; columnId: string }): Promise<string | null> {
  const [row] = await db
    .select({ position: task.position })
    .from(task)
    .where(and(eq(task.columnId, columnId), isNull(task.archivedAt)))
    .orderBy(desc(task.position))
    .limit(1);
  return row?.position ?? null;
}

/** The positions of a column's live tasks, other than `exceptId`'s. */
export async function findColumnPositions({
  db,
  columnId,
  exceptId,
}: {
  db: Database;
  columnId: string;
  exceptId: string;
}): Promise<string[]> {
  const rows = await db
    .select({ position: task.position })
    .from(task)
    .where(and(eq(task.columnId, columnId), isNull(task.archivedAt), ne(task.id, exceptId)));
  return rows.map((row) => row.position);
}

/*===== People =====*/
/** Which of `ids` are active members of the project: only they can own or be given its tasks. */
/**
 * Which of `ids` are active members of the project. With `editorsOnly`, viewers are left out too: they can be
 * mentioned, but never own, take or be handed a task.
 */
export async function findActiveMemberIds({
  db,
  projectId,
  ids,
  editorsOnly = false,
}: {
  db: Database;
  projectId: string;
  ids: string[];
  editorsOnly?: boolean;
}): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: user.id })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(
      and(
        eq(projectMember.projectId, projectId),
        inArray(user.id, ids),
        eq(user.status, "active"),
        editorsOnly ? inArray(user.role, [...EDITOR_ROLES]) : undefined,
      ),
    );
  return new Set(rows.map((row) => row.id));
}

export function findPeople({ db, ids }: { db: Database; ids: string[] }): Promise<PersonRow[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return db
    .select({ id: user.id, name: user.name, role: user.role, status: user.status, avatarMediaId: user.avatarMediaId })
    .from(user)
    .where(inArray(user.id, ids))
    .orderBy(asc(user.name));
}

/*===== Tasks =====*/
/** A project's live (not archived) tasks, in board order. */
export function findLiveTasks({ db, projectId }: { db: Database; projectId: string }): Promise<TaskRecord[]> {
  return db
    .select()
    .from(task)
    .where(and(eq(task.projectId, projectId), isNull(task.archivedAt)))
    .orderBy(asc(task.position), asc(task.createdAt));
}

export async function findTaskByNumber({
  db,
  projectId,
  number,
}: {
  db: Database;
  projectId: string;
  number: number;
}): Promise<TaskRecord | undefined> {
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.projectId, projectId), eq(task.number, number)))
    .limit(1);
  return row;
}

/** A task of the project, locked until the transaction ends so two edits can't interleave. */
export async function lockTask({
  db,
  projectId,
  id,
}: {
  db: Database;
  projectId: string;
  id: string;
}): Promise<TaskRecord | undefined> {
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.id, id), eq(task.projectId, projectId)))
    .limit(1)
    .for("update");
  return row;
}

export async function insertTask({ db, values }: { db: Database; values: NewTaskRecord }): Promise<TaskRecord> {
  const [row] = await db.insert(task).values(values).returning();
  if (!row) throw new Error("insertTask: insert returned no row");
  return row;
}

export async function updateTaskRow({
  db,
  id,
  values,
}: {
  db: Database;
  id: string;
  values: Partial<NewTaskRecord>;
}): Promise<TaskRecord> {
  const [row] = await db.update(task).set(values).where(eq(task.id, id)).returning();
  if (!row) throw new Error("updateTaskRow: update returned no row");
  return row;
}

/** Removes a task for good, with everything that cascades from it (comments, logs, links, hand-offs, alerts). */
export async function deleteTaskRow({ db, id }: { db: Database; id: string }): Promise<void> {
  await db.delete(task).where(eq(task.id, id));
}

/** A project's archived tasks, most recently archived first. */
export function findArchivedTasks({ db, projectId }: { db: Database; projectId: string }): Promise<TaskRecord[]> {
  return db
    .select()
    .from(task)
    .where(and(eq(task.projectId, projectId), isNotNull(task.archivedAt)))
    .orderBy(desc(task.archivedAt));
}

/** A task assigned to someone, with where it sits, as "My Tasks" lists it. */
export type AssignedTaskRow = {
  id: string;
  projectKey: string;
  projectName: string;
  number: number;
  title: string;
  priority: string;
  dueDate: string | null;
  columnKind: string;
  columnName: string | null;
};

/**
 * The open tasks assigned to a person: live, not in a done or cancelled column, and only from projects they are a
 * member of, so a project they have left drops out (an admin included: an assignee is always a member).
 */
export function findOpenTasksAssignedTo({ db, userId }: { db: Database; userId: string }): Promise<AssignedTaskRow[]> {
  return db
    .select({
      id: task.id,
      projectKey: project.key,
      projectName: project.name,
      number: task.number,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      columnKind: boardColumn.kind,
      columnName: boardColumn.name,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .innerJoin(projectMember, and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, userId)))
    .where(
      and(assignedTo({ db, userId }), isNull(task.archivedAt), notInArray(boardColumn.kind, ["done", "cancelled"])),
    );
}

/*===== Assignees =====*/
/** A condition on `task` rows: the person is one of the task's assignees. */
export function assignedTo({ db, userId }: { db: Database; userId: string }): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(taskAssignee)
      .where(and(eq(taskAssignee.taskId, task.id), eq(taskAssignee.userId, userId))),
  );
}

/** The assignees of each task, in the order they joined, as `taskId → userIds`. A task with none has no entry. */
export async function findAssigneeIdsByTask({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const rows = await db
    .select({ taskId: taskAssignee.taskId, userId: taskAssignee.userId })
    .from(taskAssignee)
    .where(inArray(taskAssignee.taskId, taskIds))
    .orderBy(asc(taskAssignee.createdAt), asc(taskAssignee.userId));
  for (const row of rows) byTask.set(row.taskId, [...(byTask.get(row.taskId) ?? []), row.userId]);
  return byTask;
}

/**
 * Makes `userIds` a task's assignees. Those who stay keep their place; newcomers join at the end, in the order given.
 */
export async function replaceTaskAssignees({
  db,
  taskId,
  userIds,
}: {
  db: Database;
  taskId: string;
  userIds: string[];
}): Promise<void> {
  await db
    .delete(taskAssignee)
    .where(
      and(eq(taskAssignee.taskId, taskId), userIds.length > 0 ? notInArray(taskAssignee.userId, userIds) : undefined),
    );
  if (userIds.length === 0) return;
  // One timestamp apart each, so newcomers added together keep the order given.
  const now = Date.now();
  await db
    .insert(taskAssignee)
    .values(userIds.map((userId, index) => ({ taskId, userId, createdAt: new Date(now + index) })))
    .onConflictDoNothing();
}

/*===== Labels =====*/
export function findLabels({ db, projectId }: { db: Database; projectId: string }): Promise<LabelRecord[]> {
  return db.select().from(label).where(eq(label.projectId, projectId)).orderBy(asc(label.name));
}

/** The label ids of each task, as `taskId → labelIds`. */
export async function findLabelIdsByTask({
  db,
  taskIds,
}: {
  db: Database;
  taskIds: string[];
}): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const rows = await db.select().from(taskLabel).where(inArray(taskLabel.taskId, taskIds));
  for (const row of rows) byTask.set(row.taskId, [...(byTask.get(row.taskId) ?? []), row.labelId]);
  return byTask;
}

/** Replaces a task's labels with `labelIds`. */
export async function replaceTaskLabels({
  db,
  taskId,
  labelIds,
}: {
  db: Database;
  taskId: string;
  labelIds: string[];
}): Promise<void> {
  await db.delete(taskLabel).where(eq(taskLabel.taskId, taskId));
  if (labelIds.length > 0) await db.insert(taskLabel).values(labelIds.map((labelId) => ({ taskId, labelId })));
}

export async function findLabelByName({
  db,
  projectId,
  name,
}: {
  db: Database;
  projectId: string;
  name: string;
}): Promise<LabelRecord | undefined> {
  const [row] = await db
    .select()
    .from(label)
    .where(and(eq(label.projectId, projectId), eq(label.name, name)))
    .limit(1);
  return row;
}

export async function insertLabel({
  db,
  values,
}: {
  db: Database;
  values: typeof label.$inferInsert;
}): Promise<LabelRecord> {
  const [row] = await db.insert(label).values(values).returning();
  if (!row) throw new Error("insertLabel: insert returned no row");
  return row;
}

/** One of the project's labels; undefined for a label another project has, so an id can't reach across projects. */
export async function findLabel({
  db,
  projectId,
  labelId,
}: {
  db: Database;
  projectId: string;
  labelId: string;
}): Promise<LabelRecord | undefined> {
  const [row] = await db
    .select()
    .from(label)
    .where(and(eq(label.projectId, projectId), eq(label.id, labelId)))
    .limit(1);
  return row;
}

export async function updateLabelRow({
  db,
  labelId,
  values,
}: {
  db: Database;
  labelId: string;
  values: Pick<typeof label.$inferInsert, "name" | "color">;
}): Promise<LabelRecord> {
  const [row] = await db.update(label).set(values).where(eq(label.id, labelId)).returning();
  if (!row) throw new Error("updateLabelRow: update returned no row");
  return row;
}

/** Deletes a label. `task_label` cascades, so it also comes off every task that had it, archived ones included. */
export async function deleteLabelRow({ db, labelId }: { db: Database; labelId: string }): Promise<void> {
  await db.delete(label).where(eq(label.id, labelId));
}
