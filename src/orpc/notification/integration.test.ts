import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { notification } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addDays, teamToday } from "#/lib/team-day";
import { remindDue } from "#/orpc/notification/service";
import { createTask, transitionTask, updateTask } from "#/orpc/task/service";

/*===== Due-Date Reminders =====*/
// The bell asks every half minute and each ask checks due dates, so a reminder must go out once, not on every ask
// (docs/task-manager-plan.md → slice 12).

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "due", names: ["admin", "ali"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const remindersOf = (taskId: string) =>
  db
    .select({ kind: notification.kind, dueDate: notification.dueDate })
    .from(notification)
    // Only the reminders: creating the task also told Ali it was assigned to them.
    .where(
      and(eq(notification.userId, fixture.users.ali), eq(notification.taskId, taskId), isNotNull(notification.dueDate)),
    );

describe("due-date reminders", () => {
  it("tells the assignee once that a task is overdue, and again only for a new due date", async () => {
    const { projectId, users } = fixture;
    const today = teamToday();
    const late = addDays({ date: today, days: -2 });
    const created = await createTask({
      db,
      actorId: users.admin,
      projectId,
      input: { title: "دیرکرد", assigneeId: users.ali, dueDate: late },
    });
    if (created.kind !== "success") throw new Error("setup failed");

    await remindDue({ db, userId: users.ali });
    await remindDue({ db, userId: users.ali });
    expect(await remindersOf(created.task.id)).toEqual([{ kind: "overdue", dueDate: late }]);

    const tomorrow = addDays({ date: today, days: 1 });
    await updateTask({
      db,
      actor: { id: users.admin, role: "admin" },
      projectId,
      taskId: created.task.id,
      input: { dueDate: tomorrow },
    });
    await remindDue({ db, userId: users.ali });
    expect(await remindersOf(created.task.id)).toHaveLength(2);
  });

  it("never reminds about a done task", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({
      db,
      actorId: users.admin,
      projectId,
      input: { title: "تمام‌شده", assigneeId: users.ali, dueDate: addDays({ date: teamToday(), days: -1 }) },
    });
    if (created.kind !== "success") throw new Error("setup failed");
    await transitionTask({ db, actorId: users.ali, projectId, taskId: created.task.id, action: "done" });

    await remindDue({ db, userId: users.ali });
    expect(await remindersOf(created.task.id)).toEqual([]);
  });
});
