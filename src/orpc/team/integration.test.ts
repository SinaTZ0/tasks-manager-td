import { randomUUID } from "node:crypto";

import { and, eq, inArray, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity, user } from "#/db/schema";
import { deleteTestActivity } from "#/db/test-cleanup.server";
import { auth } from "#/lib/auth.server";
import { insertUserWithPassword } from "#/orpc/team/repository";
import { changeMember, resetMemberPassword } from "#/orpc/team/service";

/*===== Team =====*/
// The team must never lose its last active admin, or nobody could manage it again.

const runId = randomUUID().slice(0, 8);
const actor = `test-team-actor-${runId}`;
const admin = `test-team-admin-${runId}`;
const mate = `test-team-mate-${runId}`;
const mateEmail = `${mate}@example.test`;

/** Signs the teammate in, for its status and the headers that carry the new session. */
async function signIn(password: string) {
  const response = await auth.api.signInEmail({ body: { email: mateEmail, password }, asResponse: true });
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { ok: response.ok, headers: new Headers({ cookie }) };
}

const historyOf = (action: "user.password_changed" | "user.password_reset") =>
  db
    .select()
    .from(activity)
    .where(and(eq(activity.action, action), inArray(activity.actorId, [actor, mate])));

beforeAll(async () => {
  await db.insert(user).values([
    { id: actor, name: "Actor", email: `${actor}@example.test`, role: "admin" },
    { id: admin, name: "Admin", email: `${admin}@example.test`, role: "admin" },
  ]);
  await insertUserWithPassword({
    db,
    values: { id: mate, name: "Mate", email: mateEmail, emailVerified: true, role: "user", status: "active" },
    passwordHash: await (await auth.$context).password.hash("first-password"),
  });
});

afterAll(async () => {
  await deleteTestActivity({ db, actorIds: [actor, mate] });
  await db.delete(user).where(inArray(user.id, [actor, admin, mate]));
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

// The password is the one thing that gets someone back in, and the one thing history must never hold.
describe("passwords", () => {
  it("records a person's own change, but not a refused one", async () => {
    const { headers } = await signIn("first-password");

    const refused = await auth.api.changePassword({
      headers,
      body: { currentPassword: "not-my-password", newPassword: "second-password" },
      asResponse: true,
    });
    expect(refused.ok).toBe(false);
    expect(await historyOf("user.password_changed")).toHaveLength(0);

    await auth.api.changePassword({
      headers,
      body: { currentPassword: "first-password", newPassword: "second-password" },
    });
    expect(await historyOf("user.password_changed")).toHaveLength(1);
    expect((await signIn("second-password")).ok).toBe(true);
  });

  it("resets a teammate's password and ends the sessions of the old one", async () => {
    const { headers } = await signIn("second-password");

    expect(
      await resetMemberPassword({ db, actorId: actor, input: { userId: mate, password: "third-password" } }),
    ).toEqual({ kind: "success" });

    expect(await auth.api.getSession({ headers })).toBeNull();
    expect((await signIn("second-password")).ok).toBe(false);
    expect((await signIn("third-password")).ok).toBe(true);

    const entries = await historyOf("user.password_reset");
    expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries)).not.toContain("third-password");
  });

  it("refuses an admin's own reset, which must go through the current password", async () => {
    expect(
      await resetMemberPassword({ db, actorId: actor, input: { userId: actor, password: "fourth-password" } }),
    ).toMatchObject({ kind: "conflict" });
  });
});
