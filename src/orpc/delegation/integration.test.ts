import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { delegateTask, listDelegatedBy } from "#/orpc/delegation/service";
import { listNotifications, markNotificationsRead } from "#/orpc/notification/service";
import { createTask, getTask } from "#/orpc/task/service";

/*===== Delegation and Notifications =====*/
// Handing a task on changes who does it, never who answers for it (docs/app.md rule 6), and only the person a
// notification is for ever reads or clears it.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "sina" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "delegation", names: ["admin", "sina", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

describe("delegation", () => {
  it("hands a task on without changing its owner, and keeps the chain", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.sina, projectId, input: { title: "گزارش ماهانه" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;

    const hand = (actorId: string, toId: string) => delegateTask({ db, actorId, projectId, taskId, toId });
    expect(await hand(users.sina, users.ali)).toEqual({ kind: "ok" });
    expect(await hand(users.ali, users.reza)).toEqual({ kind: "ok" });
    expect(await hand(users.ali, users.reza)).toMatchObject({ kind: "invalid", fields: { toId: expect.any(String) } });

    const task = await getTask({ db, projectId, number: created.task.number });
    expect(task).toMatchObject({ ownerId: users.sina, assigneeId: users.reza });
    expect(task?.handoffs.map((handoff) => [handoff.fromName, handoff.toName])).toEqual([
      [users.sina, users.ali],
      [users.ali, users.reza],
    ]);

    // The owner still finds it, and so does Ali, who handed it on without owning it.
    for (const id of [users.sina, users.ali]) {
      const mine = await listDelegatedBy({ db, user: { id } });
      expect(mine.map((item) => item.id)).toContain(taskId);
    }
    expect((await listDelegatedBy({ db, user: { id: users.reza } })).map((item) => item.id)).not.toContain(taskId);
  });

  it("tells only the person a notification is for, and only they can mark it read", async () => {
    const { projectId, users } = fixture;
    await createTask({
      db,
      actorId: users.sina,
      projectId,
      input: { title: "بازبینی قرارداد", assigneeId: users.reza },
    });

    const forReza = await listNotifications({ db, userId: users.reza });
    const assigned = forReza.items.find((item) => item.kind === "assigned" && item.taskTitle === "بازبینی قرارداد");
    expect(assigned).toBeDefined();
    if (!assigned) return;
    expect((await listNotifications({ db, userId: users.ali })).items.map((item) => item.id)).not.toContain(
      assigned.id,
    );

    await markNotificationsRead({ db, userId: users.ali, ids: [assigned.id] });
    const after = await listNotifications({ db, userId: users.reza });
    expect(after.items.find((item) => item.id === assigned.id)?.read).toBe(false);
  });
});
