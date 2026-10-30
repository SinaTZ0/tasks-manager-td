import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addChecklistItem, editChecklistItem } from "#/orpc/checklist/service";
import { createTask } from "#/orpc/task/service";

/*===== Checklists =====*/
// A ticked step says who ticked it and when, on the step and in the task's history; unticking clears both, so the
// step never claims a tick that was taken back.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "checklist", names: ["admin", "ali"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

describe("checklists", () => {
  it("records who ticked a step and when", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.admin, projectId, input: { title: "انتشار" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const added = await addChecklistItem({ db, actorId: users.admin, projectId, taskId: created.task.id, text: "تست" });
    if (added.kind !== "success") throw new Error("setup failed");
    const itemId = added.item.id;

    const ticked = await editChecklistItem({ db, actorId: users.ali, projectId, itemId, done: true });
    expect(ticked).toMatchObject({ kind: "success", item: { doneBy: users.ali, doneAt: expect.any(Date) } });

    const entries = await db
      .select({ action: activity.action, actorId: activity.actorId })
      .from(activity)
      .where(and(eq(activity.taskId, created.task.id), like(activity.action, "checklist.%")))
      .orderBy(activity.seq);
    expect(entries).toEqual([
      { action: "checklist.added", actorId: users.admin },
      { action: "checklist.ticked", actorId: users.ali },
    ]);

    const unticked = await editChecklistItem({ db, actorId: users.admin, projectId, itemId, done: false });
    expect(unticked).toMatchObject({ kind: "success", item: { doneBy: null, doneAt: null } });
  });
});
