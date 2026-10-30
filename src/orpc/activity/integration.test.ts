import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity, user } from "#/db/schema";
import { deleteTestActivity } from "#/db/test-cleanup.server";
import { recordActivity } from "#/orpc/activity/service";

/*===== Activity =====*/
// History can't be edited or removed by any code path: the database refuses it (docs/app.md rule 7).

const actor = `test-activity-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await db.insert(user).values({ id: actor, name: "Test user", email: `${actor}@example.test` });
});

afterAll(async () => {
  await deleteTestActivity({ db, actorIds: [actor] });
  await db.delete(user).where(eq(user.id, actor));
  await db.$client.end();
});

describe("activity", () => {
  it("is append-only", async () => {
    await recordActivity({ db, actorId: actor, entries: [{ action: "user.created", snapshot: { name: "x" } }] });

    // Drizzle wraps the database's error; the trigger's own message is its cause.
    const refused = { cause: expect.objectContaining({ message: expect.stringContaining("append-only") }) };
    await expect(
      db.update(activity).set({ action: "edited" }).where(eq(activity.actorId, actor)),
    ).rejects.toMatchObject(refused);
    await expect(db.delete(activity).where(eq(activity.actorId, actor))).rejects.toMatchObject(refused);

    const rows = await db.select().from(activity).where(eq(activity.actorId, actor));
    expect(rows.map((row) => row.action)).toEqual(["user.created"]);
  });
});
