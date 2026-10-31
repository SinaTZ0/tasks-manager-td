import { and, asc, desc, eq, exists, inArray, isNull, not, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "#/db/client.server";
import { boardColumn, delegation, project, projectMember, task, taskAssignee, user } from "#/db/schema";

/*===== Types =====*/
type NewDelegationRecord = typeof delegation.$inferInsert;
export type HandoffRow = {
  id: string;
  taskId: string;
  fromName: string;
  toName: string;
  note: string | null;
  createdAt: Date;
};
export type DelegatedTaskRow = {
  id: string;
  projectKey: string;
  projectName: string;
  number: number;
  title: string;
  priority: string;
  dueDate: string | null;
  columnKind: string;
  columnName: string | null;
  ownerId: string;
};

/*===== Writes =====*/
export async function insertDelegation({ db, values }: { db: Database; values: NewDelegationRecord }): Promise<void> {
  await db.insert(delegation).values(values);
}

/*===== Reads =====*/
/** The tasks' hand-offs, oldest first, with both people's names. */
export function findHandoffs({ db, taskIds }: { db: Database; taskIds: string[] }): Promise<HandoffRow[]> {
  if (taskIds.length === 0) return Promise.resolve([]);
  const from = alias(user, "from_user");
  const to = alias(user, "to_user");
  return db
    .select({
      id: delegation.id,
      taskId: delegation.taskId,
      fromName: from.name,
      toName: to.name,
      note: delegation.note,
      createdAt: delegation.createdAt,
    })
    .from(delegation)
    .innerJoin(from, eq(from.id, delegation.fromId))
    .innerJoin(to, eq(to.id, delegation.toId))
    .where(inArray(delegation.taskId, taskIds))
    .orderBy(asc(delegation.createdAt));
}

/**
 * The live tasks a person handed on, or owns and someone handed on, that they aren't doing themselves: "delegated by me"
 * (docs/app.md → Assign & Delegate). Only from projects they are on, unless they are an admin, who sees every project.
 */
export function findDelegatedBy({
  db,
  userId,
  admin,
}: {
  db: Database;
  userId: string;
  admin: boolean;
}): Promise<DelegatedTaskRow[]> {
  const assigned = exists(
    db
      .select({ one: sql`1` })
      .from(taskAssignee)
      .where(and(eq(taskAssignee.taskId, task.id), eq(taskAssignee.userId, userId))),
  );
  const handedOn = (fromId?: string) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(delegation)
        .where(
          fromId ? and(eq(delegation.taskId, task.id), eq(delegation.fromId, fromId)) : eq(delegation.taskId, task.id),
        ),
    );
  const member = exists(
    db
      .select({ one: sql`1` })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, task.projectId), eq(projectMember.userId, userId))),
  );

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
      ownerId: task.ownerId,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .where(
      and(
        isNull(task.archivedAt),
        not(assigned),
        or(and(eq(task.ownerId, userId), handedOn()), handedOn(userId)),
        admin ? undefined : member,
      ),
    )
    .orderBy(desc(task.updatedAt));
}
