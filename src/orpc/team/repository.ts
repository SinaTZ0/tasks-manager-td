import { and, asc, count, eq, inArray, isNull, ne, notInArray } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { account, boardColumn, task, taskAssignee, user } from "#/db/schema";

/*===== Types =====*/
export type UserRecord = typeof user.$inferSelect;
type NewUserRecord = typeof user.$inferInsert;

/*===== Reads =====*/
/** Every account, oldest first, so the list keeps its order as people join. */
export function findAllUsers({ db }: { db: Database }): Promise<UserRecord[]> {
  return db.select().from(user).orderBy(asc(user.createdAt));
}

export async function findUserById({ db, id }: { db: Database; id: string }): Promise<UserRecord | undefined> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return row;
}

export async function findUserByEmail({ db, email }: { db: Database; email: string }): Promise<UserRecord | undefined> {
  const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return row;
}

/**
 * The active admins other than `exceptId`, locked until the transaction ends. Two admins demoting each other at the
 * same moment then run one after the other, and the second sees the first's change.
 */
export function lockOtherActiveAdmins({ db, exceptId }: { db: Database; exceptId: string }): Promise<{ id: string }[]> {
  return db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.status, "active"), ne(user.id, exceptId)))
    .for("update");
}

/**
 * How many open tasks (live, not in a done or cancelled column) each of `userIds` is assigned, for the team page: an
 * admin who makes someone a viewer sees what to hand on. People with none are missing from the map.
 */
export async function countOpenTasks({
  db,
  userIds,
}: {
  db: Database;
  userIds: string[];
}): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: taskAssignee.userId, open: count() })
    .from(taskAssignee)
    .innerJoin(task, eq(task.id, taskAssignee.taskId))
    .innerJoin(boardColumn, eq(boardColumn.id, task.columnId))
    .where(
      and(
        inArray(taskAssignee.userId, userIds),
        isNull(task.archivedAt),
        notInArray(boardColumn.kind, ["done", "cancelled"]),
      ),
    )
    .groupBy(taskAssignee.userId);
  return new Map(rows.map((row) => [row.userId, row.open] as const));
}

/*===== Writes =====*/
/**
 * Inserts an account the way Better-Auth's own sign-up would: the user row, and a `credential` account holding the
 * password hash. Done here rather than through Better-Auth so it shares the caller's transaction with the history entry.
 */
export async function insertUserWithPassword({
  db,
  values,
  passwordHash,
}: {
  db: Database;
  values: NewUserRecord;
  passwordHash: string;
}): Promise<UserRecord> {
  const [row] = await db.insert(user).values(values).returning();
  if (!row) throw new Error("insertUserWithPassword: insert returned no row");
  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId: row.id,
    accountId: row.id,
    providerId: "credential",
    password: passwordHash,
  });
  return row;
}

/**
 * Replaces the password hash on the person's `credential` account.
 *
 * @returns whether they have one to replace.
 */
export async function updateCredentialPassword({
  db,
  userId,
  passwordHash,
}: {
  db: Database;
  userId: string;
  passwordHash: string;
}): Promise<boolean> {
  const rows = await db
    .update(account)
    .set({ password: passwordHash })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  return rows.length > 0;
}

export async function updateUser({
  db,
  id,
  values,
}: {
  db: Database;
  id: string;
  values: Partial<Pick<NewUserRecord, "role" | "status">>;
}): Promise<UserRecord> {
  const [row] = await db.update(user).set(values).where(eq(user.id, id)).returning();
  if (!row) throw new Error("updateUser: update returned no row");
  return row;
}
