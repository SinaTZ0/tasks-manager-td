import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { findColumns } from "#/orpc/project/repository";
import { createTask, moveTask, transitionTask } from "#/orpc/task/service";
import { getTaskTime } from "#/orpc/time/service";

/*===== Status and Time =====*/
// Stopping a task needs a reason (docs/app.md rule 5), and nobody clocks their work: how long a task took is read from
// the columns it has been in, from its history.

let fixture: Awaited<ReturnType<typeof createTestProject<"ali">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "time", names: ["ali"] });
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

const act = ({ taskId, action, reason }: { taskId: string; action: "done" | "stop" | "reopen"; reason?: string }) =>
  transitionTask({ db, actorId: fixture.users.ali, projectId: fixture.projectId, taskId, action, reason });

describe("status and time", () => {
  it("needs a reason to stop a task, and a stopped task only reopens", async () => {
    const task = await newTask("توقف");

    expect(await act({ taskId: task.id, action: "stop", reason: "  " })).toMatchObject({
      kind: "invalid",
      fields: { reason: expect.any(String) },
    });
    expect(await act({ taskId: task.id, action: "stop", reason: "دیگر لازم نیست" })).toMatchObject({
      kind: "success",
    });
    expect(await act({ taskId: task.id, action: "done" })).toMatchObject({ kind: "invalid" });
    expect(await act({ taskId: task.id, action: "reopen" })).toMatchObject({ kind: "success" });
  });

  it("reads the columns a task has been in from its history", async () => {
    const { projectId, users } = fixture;
    const task = await newTask("مسیر");
    const doing = (await findColumns({ db, projectId })).find((column) => column.kind === "doing");
    if (!doing) throw new Error("setup failed");
    await moveTask({ db, actorId: users.ali, projectId, taskId: task.id, columnId: doing.id, position: "a0" });
    await act({ taskId: task.id, action: "done" });

    const time = await getTaskTime({ db, projectId, number: task.number });
    expect(time?.stays.map((stay) => [stay.kind, stay.leftAt === null])).toEqual([
      ["todo", false],
      ["doing", false],
      ["done", true],
    ]);
  });
});
