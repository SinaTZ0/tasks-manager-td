import { call } from "@orpc/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import type { LiveEvent } from "#/orpc/live/contract";
import { stopLiveListener, whenListening } from "#/orpc/live/listener.server";
import { liveEventsProcedure } from "#/orpc/live/procedure";
import { setProjectMember } from "#/orpc/project/service";
import { createTask } from "#/orpc/task/service";

/*===== Live Updates =====*/
// Runs against the dev database, whose LISTEN/NOTIFY carries the signals. A board change reaches the streams of the
// project's members only: the stream never tells anyone else that the project exists or moved.

// The session is the request's: the test names its user in a header instead of a cookie.
vi.mock("#/lib/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#/lib/auth.server")>()),
  getRequestSession: async (headers: Headers) => {
    const id = headers.get("x-test-user");
    if (!id) return null;
    const { db: database } = await import("#/db/client.server");
    const { user: users } = await import("#/db/schema");
    const { eq: equals } = await import("drizzle-orm");
    const [row] = await database.select().from(users).where(equals(users.id, id));
    return row ? { user: row, session: {} } : null;
  },
}));

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

/** Opens a user's stream and collects what it says until `close`. */
async function openStream(userId: string) {
  const controller = new AbortController();
  const events: LiveEvent[] = [];
  const iterator = await call(liveEventsProcedure, undefined, {
    context: { headers: new Headers({ "x-test-user": userId }) },
    signal: controller.signal,
  });
  const done = (async () => {
    for await (const event of iterator) events.push(event);
  })().catch(() => {});
  return {
    events,
    close: async () => {
      controller.abort();
      await done;
    },
  };
}

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "live", names: ["admin", "ali", "reza"] });
  const { projectId, users } = fixture;
  await setProjectMember({ db, actorId: users.admin, projectId, userId: users.reza, member: false });
});

afterAll(async () => {
  await stopLiveListener();
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

describe("live updates", () => {
  it("tells only the project's members about a change", async () => {
    const { projectId, users } = fixture;
    const member = await openStream(users.ali);
    const outsider = await openStream(users.reza);
    await whenListening();

    await createTask({ db, actorId: users.admin, projectId, input: { title: "زنده" } });
    await vi.waitFor(() => expect(member.events).toContainEqual({ type: "project", projectId }), { timeout: 3000 });
    // The member heard it, so the signal has gone round; the outsider's stream had the same chance.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await member.close();
    await outsider.close();

    expect(outsider.events).toEqual([{ type: "ready" }]);
  });
});
