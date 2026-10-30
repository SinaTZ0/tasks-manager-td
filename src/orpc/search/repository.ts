import { and, desc, eq, exists, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "#/db/client.server";
import { boardColumn, comment, project, projectMember, task, taskAlias } from "#/db/schema";

/*===== Types =====*/
export type SearchRow = {
  id: string;
  projectKey: string;
  projectName: string;
  number: number;
  title: string;
  descriptionText: string;
  columnKind: string;
  columnName: string | null;
  archivedAt: Date | null;
  /** The latest comment that matched, when one did. */
  commentText: string | null;
};

/** `%`, `_` and the escape character itself match literally (Postgres' default `ILIKE` escape is a backslash). */
function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Limits a query to the projects a person can open: the ones they are on, or every one for an admin. */
function visibleTo({ db, userId, admin }: { db: Database; userId: string; admin: boolean }) {
  if (admin) return undefined;
  return exists(
    db
      .select({ one: sql`1` })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, userId))),
  );
}

const columns = {
  id: task.id,
  projectKey: project.key,
  projectName: project.name,
  number: task.number,
  title: task.title,
  descriptionText: task.descriptionText,
  columnKind: boardColumn.kind,
  columnName: boardColumn.name,
  archivedAt: task.archivedAt,
};

/*===== Reads =====*/
/** One task by its code, if the person can open its project. */
export async function findTaskByCode({
  db,
  userId,
  admin,
  key,
  number,
}: {
  db: Database;
  userId: string;
  admin: boolean;
  key: string;
  number: number;
}): Promise<SearchRow | undefined> {
  const [row] = await db
    .select({ ...columns, commentText: sql<string | null>`null` })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .where(and(eq(project.key, key), eq(task.number, number), visibleTo({ db, userId, admin })))
    .limit(1);
  return row;
}

/** The task an old code named before it moved to another project (slice 20), where it is now. */
export async function findTaskByOldCode({
  db,
  userId,
  admin,
  key,
  number,
}: {
  db: Database;
  userId: string;
  admin: boolean;
  key: string;
  number: number;
}): Promise<SearchRow | undefined> {
  const oldProject = alias(project, "old_project");
  const [row] = await db
    .select({ ...columns, commentText: sql<string | null>`null` })
    .from(taskAlias)
    .innerJoin(oldProject, eq(oldProject.id, taskAlias.projectId))
    .innerJoin(task, eq(task.id, taskAlias.taskId))
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .where(and(eq(oldProject.key, key), eq(taskAlias.number, number), visibleTo({ db, userId, admin })))
    .limit(1);
  return row;
}

/**
 * Tasks whose title, description or (undeleted) comments contain `text`, case-insensitively, from the projects the
 * person can open: live ones first, then the most recently changed. `text` must already be normalized as stored text
 * is (`normalizePersianText`), so ی/ي and ک/ك match. A plain `ILIKE` scan is enough at a five-person team's size.
 */
export function findTasksContaining({
  db,
  userId,
  admin,
  text,
  limit,
}: {
  db: Database;
  userId: string;
  admin: boolean;
  text: string;
  limit: number;
}): Promise<SearchRow[]> {
  const pattern = containsPattern(text);
  const matchingComment = db
    .select({ bodyText: comment.bodyText })
    .from(comment)
    .where(and(eq(comment.taskId, task.id), isNull(comment.deletedAt), sql`${comment.bodyText} ilike ${pattern}`))
    .orderBy(desc(comment.createdAt))
    .limit(1);

  return db
    .select({ ...columns, commentText: sql<string | null>`(${matchingComment})` })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .where(
      and(
        visibleTo({ db, userId, admin }),
        or(sql`${task.title} ilike ${pattern}`, sql`${task.descriptionText} ilike ${pattern}`, exists(matchingComment)),
      ),
    )
    .orderBy(sql`${task.archivedAt} is not null`, desc(task.updatedAt))
    .limit(limit);
}
