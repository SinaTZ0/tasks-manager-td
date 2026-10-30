import { call, ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "#/db/client.server";
import { user } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addFileAttachmentProcedure } from "#/orpc/attachment/procedure";
import { addFileAttachment } from "#/orpc/attachment/service";
import { archiveTask, createTask, deleteTask } from "#/orpc/task/service";

/*===== Attachments =====*/
// Runs against the dev database and the dev bucket (compose.dev.yaml). A viewer changes nothing, files included; and
// a task deleted for good takes its files out of the bucket, so nothing is left reachable at their old addresses.

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

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "vera">>>;

const as = (userId: string) => ({ context: { headers: new Headers({ "x-test-user": userId }) } });

async function png(): Promise<File> {
  const body = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#3366cc" } })
    .png()
    .toBuffer();
  return new File([new Uint8Array(body)], "screenshot.png", { type: "image/png" });
}

async function newTask(title: string) {
  const { projectId, users } = fixture;
  const created = await createTask({ db, actorId: users.admin, projectId, input: { title } });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task;
}

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "attachment", names: ["admin", "vera"] });
  await db.update(user).set({ role: "viewer" }).where(eq(user.id, fixture.users.vera));
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

describe("attachments", () => {
  it("refuses a file from a viewer", async () => {
    const { projectId, users } = fixture;
    const task = await newTask("پیوست بیننده");
    const refused = call(addFileAttachmentProcedure, { projectId, taskId: task.id, file: await png() }, as(users.vera));
    await expect(refused).rejects.toSatisfy((error) => error instanceof ORPCError && error.code === "FORBIDDEN");
  });

  it("takes a deleted task's files out of the bucket", async () => {
    const { projectId, users } = fixture;
    const task = await newTask("پیوست حذف");
    const added = await addFileAttachment({ db, actorId: users.admin, projectId, taskId: task.id, file: await png() });
    if (added.kind !== "success") throw new Error("setup failed");
    const urls = [added.attachment.url, added.attachment.preview?.url ?? ""];
    expect((await Promise.all(urls.map((url) => fetch(url)))).map((response) => response.status)).toEqual([200, 200]);

    await archiveTask({ db, actorId: users.admin, projectId, taskId: task.id });
    expect(await deleteTask({ db, actor: { id: users.admin, role: "admin" }, projectId, taskId: task.id })).toEqual({
      kind: "ok",
    });
    expect((await Promise.all(urls.map((url) => fetch(url)))).map((response) => response.status)).toEqual([404, 404]);
  });
});
