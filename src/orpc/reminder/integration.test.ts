import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { notification, projectMember, reminder } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { clearReminder, fireReminders, listReminders, setReminder } from "#/orpc/reminder/service";
import { createTask, transitionTask } from "#/orpc/task/service";

/*===== Reminders =====*/
// A reminder is a promise: it fires once, whatever became of the card, and only to someone who can still read it.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

const HOUR = 60 * 60 * 1000;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "reminder", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

async function newTask(title: string) {
  const { projectId, users } = fixture;
  const created = await createTask({ db, actorId: users.admin, projectId, input: { title } });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task.id;
}

/** Sets Ali's (or someone's) reminder an hour from now. */
async function remind({ taskId, userId, note }: { taskId: string; userId: string; note?: string }) {
  const result = await setReminder({
    db,
    userId,
    projectId: fixture.projectId,
    taskId,
    input: { remindAt: new Date(Date.now() + HOUR), note },
  });
  expect(result).toEqual({ kind: "success" });
}

const remindersOn = ({ taskId, userId }: { taskId: string; userId: string }) =>
  db
    .select({ data: notification.data })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.taskId, taskId), eq(notification.kind, "reminder")));

describe("reminders", () => {
  it("fires once when its time comes, and not before", async () => {
    const { users } = fixture;
    const taskId = await newTask("یادآوری");
    await remind({ taskId, userId: users.ali, note: "از رضا بپرس" });

    await fireReminders({ db });
    expect(await remindersOn({ taskId, userId: users.ali })).toEqual([]);

    await fireReminders({ db, now: Date.now() + 2 * HOUR });
    await fireReminders({ db, now: Date.now() + 2 * HOUR });
    const told = await remindersOn({ taskId, userId: users.ali });
    expect(told).toHaveLength(1);
    expect(told[0]?.data).toMatchObject({ note: "از رضا بپرس" });
    expect(await listReminders({ db, user: { id: users.ali } })).toEqual([]);
  });

  it("still fires on a card finished meanwhile, and says so", async () => {
    const { projectId, users } = fixture;
    const taskId = await newTask("تمام می‌شود");
    await remind({ taskId, userId: users.ali });
    await transitionTask({ db, actorId: users.admin, projectId, taskId, action: "done" });

    await fireReminders({ db, now: Date.now() + 2 * HOUR });
    const told = await remindersOn({ taskId, userId: users.ali });
    expect(told[0]?.data).toMatchObject({ event: "completed" });
  });

  it("is dropped, untold, for someone no longer on the project", async () => {
    const { projectId, users } = fixture;
    const taskId = await newTask("محرمانه");
    await remind({ taskId, userId: users.reza });
    await db
      .delete(projectMember)
      .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, users.reza)));

    expect(await listReminders({ db, user: { id: users.reza } })).toEqual([]);
    await fireReminders({ db, now: Date.now() + 2 * HOUR });
    expect(await remindersOn({ taskId, userId: users.reza })).toEqual([]);
    expect(await db.select().from(reminder).where(eq(reminder.taskId, taskId))).toEqual([]);
  });

  it("is its person's alone: a second one replaces theirs, and clearing leaves others'", async () => {
    const { users } = fixture;
    const taskId = await newTask("دو نفر");
    await remind({ taskId, userId: users.ali, note: "اول" });
    await remind({ taskId, userId: users.ali, note: "دوم" });
    await remind({ taskId, userId: users.admin });

    const mine = await listReminders({ db, user: { id: users.ali } });
    expect(mine.filter((item) => item.taskId === taskId).map((item) => item.note)).toEqual(["دوم"]);

    await clearReminder({ db, userId: users.ali, taskId });
    const rows = await db.select({ userId: reminder.userId }).from(reminder).where(eq(reminder.taskId, taskId));
    expect(rows).toEqual([{ userId: users.admin }]);
  });

  it("refuses a time that has passed", async () => {
    const { projectId, users } = fixture;
    const taskId = await newTask("گذشته");
    const result = await setReminder({
      db,
      userId: users.ali,
      projectId,
      taskId,
      input: { remindAt: new Date(Date.now() - HOUR) },
    });
    expect(result.kind).toBe("invalid");
  });
});
