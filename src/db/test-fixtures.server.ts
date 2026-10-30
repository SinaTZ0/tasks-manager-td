import { randomUUID } from "node:crypto";

import { inArray, sql } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { activity, project, task, user } from "#/db/schema";
import { createProject } from "#/orpc/project/service";

/*===== Test Fixtures =====*/
// Rows the integration tests share: a run's own users and project, made per run and removed afterwards, so the tests
// can run against a development database.

/** A key no other run uses: 2–5 capitals. */
export function testProjectKey(): string {
  const letters = randomUUID()
    .replace(/[^a-f]/g, "")
    .toUpperCase();
  return `Z${letters.padEnd(4, "Q").slice(0, 4)}`;
}

/**
 * Makes users (the first one an admin) and one project they are all members of.
 *
 * @returns The user ids by name, and the project's id and key.
 */
export async function createTestProject<const Name extends string>({
  db,
  prefix,
  names,
}: {
  db: Database;
  prefix: string;
  names: readonly [Name, ...Name[]];
}): Promise<{ users: Record<Name, string>; projectId: string; key: string }> {
  const run = randomUUID().slice(0, 8);
  const users = Object.fromEntries(names.map((name) => [name, `test-${prefix}-${name}-${run}`])) as Record<
    Name,
    string
  >;
  const ids = Object.values<string>(users);
  await db
    .insert(user)
    .values(
      ids.map((id, index) => ({ id, name: id, email: `${id}@example.test`, role: index === 0 ? "admin" : "user" })),
    );

  const key = testProjectKey();
  const created = await createProject({ db, actorId: ids[0] ?? "", input: { name: key, key, memberIds: ids } });
  if (created.kind !== "success") throw new Error("createTestProject: project not created");
  return { users, projectId: created.project.id, key };
}

/**
 * Removes what `createTestProject` made and everything written under it. History is append-only: the trigger lets
 * the delete through only in a transaction that set `tofang.test_cleanup` (at the end of drizzle/0000_init.sql).
 */
export async function deleteTestProject({
  db,
  projectId,
  extraProjectIds = [],
  userIds,
}: {
  db: Database;
  projectId: string;
  /** Other projects the test made with the same users, removed with it. */
  extraProjectIds?: string[];
  userIds: string[];
}): Promise<void> {
  const projectIds = [projectId, ...extraProjectIds];
  await db.transaction(async (tx) => {
    await tx.execute(sql`set local tofang.test_cleanup = 'on'`);
    await tx.delete(activity).where(inArray(activity.actorId, userIds));
    await tx.delete(task).where(inArray(task.projectId, projectIds));
    await tx.delete(project).where(inArray(project.id, projectIds));
    await tx.delete(user).where(inArray(user.id, userIds));
  });
}
