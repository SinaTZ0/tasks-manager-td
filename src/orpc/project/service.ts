import { generateNKeysBetween } from "fractional-indexing";
import { z } from "zod";

import type { Database } from "#/db/client.server";
import { isPositionKey, resolvePosition } from "#/lib/position";
import { issuesToErrorData } from "#/lib/schema-issues";
import { recordActivity } from "#/orpc/activity/service";
import type { Column, Project, ProjectSummary } from "#/orpc/project/contract";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { toColumn, toProjectSummary } from "#/orpc/project/mapper";
import {
  deleteMember,
  findActiveUsers,
  findAllProjects,
  findColumn,
  findColumns,
  findMembersOfProjects,
  findProjectById,
  findProjectByKey,
  findProjectsOfMember,
  insertColumns,
  insertMembers,
  insertProject,
  isProjectMember,
  updateColumnRow,
  updateProjectName,
  type ProjectRecord,
} from "#/orpc/project/repository";
import { columnChangeSchema, newProjectSchema, projectNameSchema } from "#/orpc/project/validation";
import { m } from "#/paraglide/messages";

/*===== Types =====*/
/** Who is asking: admins reach every project, members only their own. */
// `role` is typed loosely because Better-Auth types additional fields as optional; the column is NOT NULL.
export type ProjectViewer = { id: string; role?: string | null };

type Invalid = { kind: "invalid"; fields: Record<string, string> };

/*===== Access =====*/
/**
 * Whether the viewer may open the project. A project they can't open looks exactly like a missing one, so callers
 * answer `not-found` for both.
 */
export async function canAccessProject({
  db,
  viewer,
  projectId,
}: {
  db: Database;
  viewer: ProjectViewer;
  projectId: string;
}): Promise<boolean> {
  if (viewer.role === "admin") return true;
  return isProjectMember({ db, projectId, userId: viewer.id });
}

/** A malformed UUID would make Postgres throw; it is treated like any unknown ID. */
const isUuid = (value: string) => z.guid().safeParse(value).success;

async function summarize({ db, record }: { db: Database; record: ProjectRecord }): Promise<ProjectSummary> {
  const members = await findMembersOfProjects({ db, projectIds: [record.id] });
  return toProjectSummary({ record, members });
}

/*===== List =====*/
export async function listProjects({ db, viewer }: { db: Database; viewer: ProjectViewer }): Promise<ProjectSummary[]> {
  const records =
    viewer.role === "admin" ? await findAllProjects({ db }) : await findProjectsOfMember({ db, userId: viewer.id });
  const members = await findMembersOfProjects({ db, projectIds: records.map((record) => record.id) });
  return records.map((record) => toProjectSummary({ record, members }));
}

/*===== Get =====*/
/** A project with its columns and members, by its key. */
export async function getProject({
  db,
  viewer,
  key,
}: {
  db: Database;
  viewer: ProjectViewer;
  key: string;
}): Promise<Project | null> {
  const record = await findProjectByKey({ db, key: key.toUpperCase() });
  if (!record || !(await canAccessProject({ db, viewer, projectId: record.id }))) return null;

  const [summary, columns] = await Promise.all([summarize({ db, record }), findColumns({ db, projectId: record.id })]);
  return { ...summary, columns: columns.map(toColumn) };
}

/*===== Create =====*/
type CreateResult = { kind: "success"; project: ProjectSummary } | Invalid;

/**
 * Creates a project with its seven columns, one of each kind, and its first members. Only active accounts can join.
 *
 * @returns `invalid` with field messages for a bad value, a key another project uses, or an unknown member.
 */
export async function createProject({
  db,
  actorId,
  input,
}: {
  db: Database;
  actorId: string;
  input: unknown;
}): Promise<CreateResult> {
  const parsed = newProjectSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { name, key, memberIds } = parsed.data;

  if (await findProjectByKey({ db, key })) return { kind: "invalid", fields: { key: m.project_error_key_taken() } };

  const members = await findActiveUsers({ db, ids: memberIds });
  if (members.length !== memberIds.length) {
    return { kind: "invalid", fields: { memberIds: m.project_error_member_unusable() } };
  }

  return db.transaction(async (tx): Promise<CreateResult> => {
    const record = await insertProject({ db: tx, values: { name, key, createdBy: actorId } });
    const positions = generateNKeysBetween(null, null, COLUMN_KINDS.length);
    await insertColumns({
      db: tx,
      values: COLUMN_KINDS.map((kind, index) => ({ projectId: record.id, kind, position: positions[index] ?? "" })),
    });
    await insertMembers({ db: tx, projectId: record.id, userIds: memberIds });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        { action: "project.created", projectId: record.id, after: { name, key }, snapshot: { name, key } },
        ...members.map((member) => ({
          action: "member.added" as const,
          projectId: record.id,
          snapshot: { userId: member.id, name: member.name },
        })),
      ],
    });
    return { kind: "success", project: await summarize({ db: tx, record }) };
  });
}

/*===== Rename =====*/
type ProjectResult = { kind: "success"; project: ProjectSummary } | { kind: "not-found" } | Invalid;

export async function renameProject({
  db,
  actorId,
  projectId,
  name: rawName,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  name: string;
}): Promise<ProjectResult> {
  const parsed = projectNameSchema.safeParse(rawName);
  if (!parsed.success) return { kind: "invalid", fields: { name: parsed.error.issues[0]?.message ?? "" } };
  if (!isUuid(projectId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<ProjectResult> => {
    const current = await findProjectById({ db: tx, id: projectId });
    if (!current) return { kind: "not-found" };
    if (current.name === parsed.data) return { kind: "success", project: await summarize({ db: tx, record: current }) };

    const record = await updateProjectName({ db: tx, id: projectId, name: parsed.data });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "project.renamed",
          projectId,
          before: { name: current.name },
          after: { name: record.name },
          snapshot: { key: record.key },
        },
      ],
    });
    return { kind: "success", project: await summarize({ db: tx, record }) };
  });
}

/*===== Members =====*/
/**
 * Adds someone to a project or takes them off it. Only an active account can be added; anyone can be taken off, and
 * their name stays on the work they did.
 */
export async function setProjectMember({
  db,
  actorId,
  projectId,
  userId,
  member,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  userId: string;
  member: boolean;
}): Promise<ProjectResult> {
  if (!isUuid(projectId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<ProjectResult> => {
    const record = await findProjectById({ db: tx, id: projectId });
    if (!record) return { kind: "not-found" };

    const already = await isProjectMember({ db: tx, projectId, userId });
    if (already === member) return { kind: "success", project: await summarize({ db: tx, record }) };

    let name: string;
    if (member) {
      const [person] = await findActiveUsers({ db: tx, ids: [userId] });
      if (!person) return { kind: "invalid", fields: { userId: m.project_error_member_unusable() } };
      name = person.name;
      await insertMembers({ db: tx, projectId, userIds: [userId] });
    } else {
      const members = await findMembersOfProjects({ db: tx, projectIds: [projectId] });
      name = members.find((row) => row.id === userId)?.name ?? "";
      await deleteMember({ db: tx, projectId, userId });
    }

    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: member ? "member.added" : "member.removed", projectId, snapshot: { userId, name } }],
    });
    return { kind: "success", project: await summarize({ db: tx, record }) };
  });
}

/*===== Columns =====*/
type ColumnResult = { kind: "success"; column: Column } | { kind: "not-found" } | Invalid;

/** Renames a column or changes its WIP limit. Its kind never changes. */
export async function changeColumn({
  db,
  actorId,
  projectId,
  columnId,
  input,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  columnId: string;
  input: unknown;
}): Promise<ColumnResult> {
  const parsed = columnChangeSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  if (!isUuid(projectId) || !isUuid(columnId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<ColumnResult> => {
    const current = await findColumn({ db: tx, projectId, id: columnId });
    if (!current) return { kind: "not-found" };

    const { name, wipLimit } = parsed.data;
    if (current.name === name && current.wipLimit === wipLimit) return { kind: "success", column: toColumn(current) };

    const record = await updateColumnRow({ db: tx, id: columnId, values: { name, wipLimit } });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: "column.updated",
          projectId,
          before: { name: current.name, wipLimit: current.wipLimit },
          after: { name, wipLimit },
          snapshot: { columnId, kind: current.kind },
        },
      ],
    });
    return { kind: "success", column: toColumn(record) };
  });
}

/*===== Column Order =====*/
/**
 * Moves a column to a new place on the board. As with cards, a key another column took meanwhile is replaced with a
 * fresh one just after it.
 */
export async function moveColumn({
  db,
  actorId,
  projectId,
  columnId,
  position,
}: {
  db: Database;
  actorId: string;
  projectId: string;
  columnId: string;
  position: string;
}): Promise<ColumnResult> {
  if (!isPositionKey(position)) return { kind: "invalid", fields: { position: m.task_error_position_invalid() } };
  if (!isUuid(projectId) || !isUuid(columnId)) return { kind: "not-found" };

  return db.transaction(async (tx): Promise<ColumnResult> => {
    const columns = await findColumns({ db: tx, projectId });
    const current = columns.find((column) => column.id === columnId);
    if (!current) return { kind: "not-found" };

    const taken = columns.filter((column) => column.id !== columnId).map((column) => column.position);
    const finalPosition = resolvePosition({ wanted: position, taken });
    if (finalPosition === current.position) return { kind: "success", column: toColumn(current) };

    const record = await updateColumnRow({ db: tx, id: columnId, values: { position: finalPosition } });
    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: "column.moved", projectId, snapshot: { columnId, kind: current.kind, name: current.name } }],
    });
    return { kind: "success", column: toColumn(record) };
  });
}
