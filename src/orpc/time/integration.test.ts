import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { timeLog } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { findColumns } from "#/orpc/project/repository";
import { createTask, moveTask, transitionTask } from "#/orpc/task/service";

/*===== Status and Time =====*/
// One running clock per person (docs/app.md rule 2), the clock apart from the column (a pause leaves the card where
// it is, marked paused once no clock runs on it), a finished card stops its clocks (rule 3), and stopping a task needs a
// reason while pausing doesn't (rule 5).

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "time", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const openLogs = (userId: string) =>
  db
    .select({ taskId: timeLog.taskId })
    .from(timeLog)
    .where(and(eq(timeLog.userId, userId), isNull(timeLog.endedAt)));

async function newTask(title: string) {
  const created = await createTask({ db, actorId: fixture.users.ali, projectId: fixture.projectId, input: { title } });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task;
}

const act = ({
  userId,
  taskId,
  action,
  reason,
}: {
  userId: string;
  taskId: string;
  action: "start" | "pause" | "done" | "stop" | "reopen";
  reason?: string;
}) => transitionTask({ db, actorId: userId, projectId: fixture.projectId, taskId, action, reason });

describe("status and time", () => {
  it("keeps one running timer per person: starting another task stops the first", async () => {
    const { users } = fixture;
    const first = await newTask("اول");
    const second = await newTask("دوم");

    expect(await act({ userId: users.ali, taskId: first.id, action: "start" })).toMatchObject({
      kind: "success",
      task: { runningSince: [expect.any(Date)] },
    });
    expect(await act({ userId: users.ali, taskId: second.id, action: "start" })).toMatchObject({ kind: "success" });
    expect(await openLogs(users.ali)).toEqual([{ taskId: second.id }]);

    // The database refuses a second open log whatever the code does.
    await expect(
      db.insert(timeLog).values({ taskId: first.id, userId: users.ali, startedAt: new Date() }),
    ).rejects.toThrow("Failed query");
  });

  it("pauses only the person's own clock, leaves the card in place, and stops every clock once it is done", async () => {
    const { projectId, users } = fixture;
    const task = await newTask("مکث");
    await act({ userId: users.ali, taskId: task.id, action: "start" });
    await act({ userId: users.reza, taskId: task.id, action: "start" });
    // Nobody pauses another's clock.
    expect(await act({ userId: users.admin, taskId: task.id, action: "pause" })).toMatchObject({ kind: "invalid" });

    // Reza still works on it, so it isn't paused yet; once his clock stops too, it is, still in its column.
    expect(await act({ userId: users.ali, taskId: task.id, action: "pause" })).toMatchObject({
      task: { columnId: task.columnId, runningSince: [expect.any(Date)], pausedAt: null },
    });
    expect(await act({ userId: users.reza, taskId: task.id, action: "pause", reason: "جلسه" })).toMatchObject({
      task: { columnId: task.columnId, runningSince: [], pausedAt: expect.any(Date) },
    });

    await act({ userId: users.ali, taskId: task.id, action: "start" });
    const done = (await findColumns({ db, projectId })).find((column) => column.kind === "done");
    if (!done) throw new Error("setup failed");
    const moved = await moveTask({
      db,
      actorId: users.ali,
      projectId,
      taskId: task.id,
      columnId: done.id,
      position: "a0",
    });
    expect(moved).toMatchObject({ task: { runningSince: [], pausedAt: null } });
    expect(await openLogs(users.ali)).toEqual([]);
  });

  it("needs a reason to stop a task but not to pause one", async () => {
    const { users } = fixture;
    const task = await newTask("توقف");
    await act({ userId: users.ali, taskId: task.id, action: "start" });

    expect(await act({ userId: users.ali, taskId: task.id, action: "pause" })).toMatchObject({ kind: "success" });
    expect(await act({ userId: users.ali, taskId: task.id, action: "stop", reason: "  " })).toMatchObject({
      kind: "invalid",
      fields: { reason: expect.any(String) },
    });
    expect(await act({ userId: users.ali, taskId: task.id, action: "stop", reason: "دیگر لازم نیست" })).toMatchObject({
      kind: "success",
    });
    // A stopped task only reopens.
    expect(await act({ userId: users.ali, taskId: task.id, action: "start" })).toMatchObject({ kind: "invalid" });
    expect(await act({ userId: users.ali, taskId: task.id, action: "reopen" })).toMatchObject({ kind: "success" });
  });
});
