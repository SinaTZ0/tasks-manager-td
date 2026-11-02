import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity } from "#/db/schema";
import { createTestProject, deleteTestProject, testProjectKey } from "#/db/test-fixtures.server";
import { plainTextToRichText } from "#/lib/rich-text";
import { addComment, listComments } from "#/orpc/comment/service";
import { addDependency } from "#/orpc/dependency/service";
import { createProject } from "#/orpc/project/service";
import { createTask, getTask } from "#/orpc/task/service";
import { moveTaskToProject, resolveOldCode } from "#/orpc/transfer/service";

/*===== Moving a Card =====*/
// A card moved to another project keeps what hangs on it (comments, time), loses the links that tied it to the old
// one, refuses to leave its people behind, and its old code still finds it.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;
let targetId: string;
let targetKey: string;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "transfer", names: ["admin", "ali", "reza"] });
  // The target has the admin and Ali, not Reza.
  targetKey = testProjectKey();
  const target = await createProject({
    db,
    actorId: fixture.users.admin,
    input: { name: targetKey, key: targetKey, memberIds: [fixture.users.admin, fixture.users.ali] },
  });
  if (target.kind !== "success") throw new Error("setup failed");
  targetId = target.project.id;
});

afterAll(async () => {
  await deleteTestProject({
    db,
    projectId: fixture.projectId,
    extraProjectIds: [targetId],
    userIds: Object.values(fixture.users),
  });
  await db.$client.end();
});

const newTask = async (input: { title: string; assigneeIds?: string[] }) => {
  const created = await createTask({ db, actorId: fixture.users.admin, projectId: fixture.projectId, input });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task;
};

describe("moving a card to another project", () => {
  it("keeps its comments, drops its dependencies, and answers to its old code", async () => {
    const { projectId, users } = fixture;
    const card = await newTask({ title: "انتقال", assigneeIds: [users.ali] });
    const waiting = await newTask({ title: "منتظر" });
    await addDependency({ db, actorId: users.admin, projectId, taskId: waiting.id, blockerId: card.id });
    await addComment({ db, actorId: users.ali, projectId, taskId: card.id, body: plainTextToRichText("یادداشت") });

    const moved = await moveTaskToProject({
      db,
      actorId: users.admin,
      projectId,
      taskId: card.id,
      targetProjectId: targetId,
    });
    expect(moved).toEqual({ kind: "success", projectKey: targetKey, number: 1 });

    const now = await getTask({ db, projectId: targetId, number: 1 });
    expect(now).toMatchObject({ id: card.id });
    expect(await listComments({ db, projectId: targetId, taskId: card.id })).toHaveLength(1);
    // The task left behind no longer waits for it, and the old project's history says so.
    expect(await getTask({ db, projectId, number: waiting.number })).toMatchObject({ waitsFor: [] });
    const removed = await db
      .select({ action: activity.action })
      .from(activity)
      .where(and(eq(activity.taskId, waiting.id), eq(activity.action, "dependency.removed")));
    expect(removed).toHaveLength(1);

    expect(await resolveOldCode({ db, actor: { id: users.ali }, projectId, number: card.number })).toEqual({
      projectKey: targetKey,
      number: 1,
    });
  });

  it("refuses a card whose assignee isn't on the target", async () => {
    const { projectId, users } = fixture;
    const card = await newTask({ title: "رضا", assigneeIds: [users.reza] });

    const moved = await moveTaskToProject({
      db,
      actorId: users.admin,
      projectId,
      taskId: card.id,
      targetProjectId: targetId,
    });
    expect(moved).toMatchObject({ kind: "invalid", errors: [expect.stringContaining(users.reza)] });
    expect(await getTask({ db, projectId, number: card.number })).toMatchObject({ id: card.id });
  });
});
