import { randomUUID } from "node:crypto";

import { and, eq, inArray, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { user } from "#/db/schema";
import { deleteTestActivity } from "#/db/test-cleanup.server";
import { changeMember } from "#/orpc/team/service";

/*===== Team =====*/
// The team must never lose its last active admin, or nobody could manage it again.

const runId = randomUUID().slice(0, 8);
const actor = `test-team-actor-${runId}`;
const admin = `test-team-admin-${runId}`;

beforeAll(async () => {
  await db.insert(user).values([
    { id: actor, name: "Actor", email: `${actor}@example.test`, role: "admin" },
    { id: admin, name: "Admin", email: `${admin}@example.test`, role: "admin" },
  ]);
});

afterAll(async () => {
  await deleteTestActivity({ db, actorIds: [actor] });
  await db.delete(user).where(inArray(user.id, [actor, admin]));
  await db.$client.end();
});

/** Thrown to roll a test's transaction back, so the admins it demoted are admins again. */
class Rollback extends Error {}

describe("team", () => {
  it("refuses a change to one's own account", async () => {
    expect(await changeMember({ db, actorId: actor, userId: actor, change: { role: "user" } })).toMatchObject({
      kind: "conflict",
    });
  });

  it("keeps the last active admin", async () => {
    // Inside a transaction that is rolled back: the development database's own admins are demoted only within it.
    await expect(
      db.transaction(async (tx) => {
        await tx
          .update(user)
          .set({ role: "user" })
          .where(and(eq(user.role, "admin"), ne(user.id, admin)));

        expect(await changeMember({ db: tx, actorId: actor, userId: admin, change: { role: "user" } })).toMatchObject({
          kind: "conflict",
        });
        expect(
          await changeMember({ db: tx, actorId: actor, userId: admin, change: { status: "blocked" } }),
        ).toMatchObject({ kind: "conflict" });
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  });

  it("demotes an admin while another stays", async () => {
    expect(await changeMember({ db, actorId: actor, userId: admin, change: { role: "user" } })).toMatchObject({
      kind: "success",
      member: { role: "user" },
    });
  });
});
