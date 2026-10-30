import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { boardColumn, project, projectMember, task, timeLog, user } from "#/db/schema";

/*===== Types =====*/
export type ProjectRecord = typeof project.$inferSelect;
export type ColumnRecord = typeof boardColumn.$inferSelect;
type NewColumnRecord = typeof boardColumn.$inferInsert;

/** A member of a project, with the account fields the pages show. */
export type MemberRow = {
  projectId: string;
  id: string;
  name: string;
  role: string;
  status: string;
  avatarMediaId: string | null;
};

/*===== Projects =====*/
/** Every project, by name. For admins, who see them all. */
export function findAllProjects({ db }: { db: Database }): Promise<ProjectRecord[]> {
  return db.select().from(project).orderBy(asc(project.name));
}

/** The projects a user is a member of, by name. */
export async function findProjectsOfMember({ db, userId }: { db: Database; userId: string }): Promise<ProjectRecord[]> {
  const rows = await db
    .select({ project })
    .from(project)
    .innerJoin(projectMember, eq(projectMember.projectId, project.id))
    .where(eq(projectMember.userId, userId))
    .orderBy(asc(project.name));
  return rows.map((row) => row.project);
}

export async function findProjectById({ db, id }: { db: Database; id: string }): Promise<ProjectRecord | undefined> {
  const [row] = await db.select().from(project).where(eq(project.id, id)).limit(1);
  return row;
}

export async function findProjectByKey({ db, key }: { db: Database; key: string }): Promise<ProjectRecord | undefined> {
  const [row] = await db.select().from(project).where(eq(project.key, key)).limit(1);
  return row;
}

export async function insertProject({
  db,
  values,
}: {
  db: Database;
  values: typeof project.$inferInsert;
}): Promise<ProjectRecord> {
  const [row] = await db.insert(project).values(values).returning();
  if (!row) throw new Error("insertProject: insert returned no row");
  return row;
}

export async function updateProjectName({
  db,
  id,
  name,
}: {
  db: Database;
  id: string;
  name: string;
}): Promise<ProjectRecord> {
  const [row] = await db.update(project).set({ name }).where(eq(project.id, id)).returning();
  if (!row) throw new Error("updateProjectName: update returned no row");
  return row;
}

/*===== Members =====*/
/** The members of the given projects, by name. */
export function findMembersOfProjects({
  db,
  projectIds,
}: {
  db: Database;
  projectIds: string[];
}): Promise<MemberRow[]> {
  if (projectIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      projectId: projectMember.projectId,
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      avatarMediaId: user.avatarMediaId,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(inArray(projectMember.projectId, projectIds))
    .orderBy(asc(user.name));
}

export async function isProjectMember({
  db,
  projectId,
  userId,
}: {
  db: Database;
  projectId: string;
  userId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ userId: projectMember.userId })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)))
    .limit(1);
  return !!row;
}

/** Adds members; one already there is left as is. */
export async function insertMembers({
  db,
  projectId,
  userIds,
}: {
  db: Database;
  projectId: string;
  userIds: string[];
}): Promise<void> {
  if (userIds.length === 0) return;
  await db
    .insert(projectMember)
    .values(userIds.map((userId) => ({ projectId, userId })))
    .onConflictDoNothing();
}

export async function deleteMember({
  db,
  projectId,
  userId,
}: {
  db: Database;
  projectId: string;
  userId: string;
}): Promise<void> {
  await db.delete(projectMember).where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)));
}

/** The accounts among `ids` that exist and are active: only those can join a project. */
export async function findActiveUsers({
  db,
  ids,
}: {
  db: Database;
  ids: string[];
}): Promise<{ id: string; name: string }[]> {
  if (ids.length === 0) return [];
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(inArray(user.id, ids), eq(user.status, "active")));
}

/*===== Columns =====*/
/** A project's columns in board order. */
export function findColumns({ db, projectId }: { db: Database; projectId: string }): Promise<ColumnRecord[]> {
  return db.select().from(boardColumn).where(eq(boardColumn.projectId, projectId)).orderBy(asc(boardColumn.position));
}

export async function findColumn({
  db,
  projectId,
  id,
}: {
  db: Database;
  projectId: string;
  id: string;
}): Promise<ColumnRecord | undefined> {
  const [row] = await db
    .select()
    .from(boardColumn)
    .where(and(eq(boardColumn.id, id), eq(boardColumn.projectId, projectId)))
    .limit(1);
  return row;
}

export async function insertColumns({ db, values }: { db: Database; values: NewColumnRecord[] }): Promise<void> {
  await db.insert(boardColumn).values(values);
}

export async function updateColumnRow({
  db,
  id,
  values,
}: {
  db: Database;
  id: string;
  values: Partial<Pick<NewColumnRecord, "name" | "wipLimit" | "position">>;
}): Promise<ColumnRecord> {
  const [row] = await db.update(boardColumn).set(values).where(eq(boardColumn.id, id)).returning();
  if (!row) throw new Error("updateColumnRow: update returned no row");
  return row;
}

/*===== Readings =====*/
/** A project's live task counts, as `findProjectReadings` returns them. */
export type ReadingsRow = { projectId: string; open: number; doing: number; running: number; late: number };

// Finished tasks never count as open or late, whatever their due date.
const OPEN = sql`${boardColumn.kind} not in ('done', 'cancelled')`;

/**
 * Each project's live (unarchived) task counts: open, in the doing column, open and past `today`, and the timers
 * running on its tasks. Two grouped reads, whatever the number of projects; a project with no tasks has no row.
 */
export async function findProjectReadings({
  db,
  projectIds,
  today,
}: {
  db: Database;
  projectIds: string[];
  /** The team's date (ISO): a task due before it is late. */
  today: string;
}): Promise<ReadingsRow[]> {
  if (projectIds.length === 0) return [];
  const live = and(inArray(task.projectId, projectIds), isNull(task.archivedAt));
  const [tasks, timers] = await Promise.all([
    db
      .select({
        projectId: task.projectId,
        open: sql<number>`count(*) filter (where ${OPEN})`.mapWith(Number),
        doing: sql<number>`count(*) filter (where ${boardColumn.kind} = 'doing')`.mapWith(Number),
        late: sql<number>`count(*) filter (where ${OPEN} and ${task.dueDate} < ${today})`.mapWith(Number),
      })
      .from(task)
      .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
      .where(live)
      .groupBy(task.projectId),
    db
      .select({ projectId: task.projectId, running: count() })
      .from(timeLog)
      .innerJoin(task, eq(task.id, timeLog.taskId))
      .where(and(live, isNull(timeLog.endedAt)))
      .groupBy(task.projectId),
  ]);
  const running = new Map(timers.map((row) => [row.projectId, row.running]));
  return tasks.map((row) => ({ ...row, running: running.get(row.projectId) ?? 0 }));
}
