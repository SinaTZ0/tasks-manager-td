import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity, comment } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addDependency } from "#/orpc/dependency/service";
import { createTask, transitionTask } from "#/orpc/task/service";

/*===== Dependencies =====*/
// Tasks that wait for each other in a loop could never start, so a loop is refused. A blocked task enters doing or
// done only when someone forces it and says why (docs/app.md rule 4), and that reason stays as a comment.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "dependency", names: ["admin", "ali"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

async function newTask(title: string) {
  const created = await createTask({ db, actorId: fixture.users.ali, projectId: fixture.projectId, input: { title } });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task;
}

const link = (taskId: string, blockerId: string) =>
  addDependency({ db, actorId: fixture.users.ali, projectId: fixture.projectId, taskId, blockerId });

describe("dependencies", () => {
  it("refuses a link that would close a loop", async () => {
    const a = await newTask("الف");
    const b = await newTask("ب");
    const c = await newTask("ج");

    expect(await link(a.id, b.id)).toEqual({ kind: "ok" });
    expect(await link(b.id, c.id)).toEqual({ kind: "ok" });
    expect(await link(c.id, a.id)).toMatchObject({ kind: "invalid", fields: { blockerId: expect.any(String) } });
    expect(await link(a.id, a.id)).toMatchObject({ kind: "invalid" });
  });

  it("lets a blocked task start only when forced, and keeps the reason as a comment", async () => {
    const { projectId, users } = fixture;
    const waiting = await newTask("منتظر");
    const blocker = await newTask("مانع");
    await link(waiting.id, blocker.id);

    const start = (forceComment?: string) =>
      transitionTask({ db, actorId: users.ali, projectId, taskId: waiting.id, action: "start", forceComment });
    expect(await start()).toEqual({ kind: "blocked", blockerIds: [blocker.id] });
    expect(await start("فوری است، مشتری منتظر است")).toMatchObject({ kind: "success" });

    const comments = await db.select({ text: comment.bodyText }).from(comment).where(eq(comment.taskId, waiting.id));
    expect(comments).toEqual([{ text: "فوری است، مشتری منتظر است" }]);
  });

  it("records the waiting task as unblocked when its last blocker is done", async () => {
    const { projectId, users } = fixture;
    const waiting = await newTask("منتظر دوم");
    const blocker = await newTask("مانع دوم");
    await link(waiting.id, blocker.id);

    await transitionTask({ db, actorId: users.ali, projectId, taskId: blocker.id, action: "done" });
    const entries = await db
      .select({ after: activity.after })
      .from(activity)
      .where(and(eq(activity.taskId, waiting.id), eq(activity.action, "task.unblocked")));
    expect(entries).toEqual([{ after: expect.objectContaining({ blockerId: blocker.id, ownerId: users.ali }) }]);
  });
});
