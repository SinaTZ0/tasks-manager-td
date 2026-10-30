import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { findColumns } from "#/orpc/project/repository";
import { archiveTask, createTask, getBoard, getTask, moveTask, updateTask } from "#/orpc/task/service";

/*===== Tasks =====*/
// Every change to a task leaves a history entry in the same transaction (docs/app.md rule 7), and archiving takes a
// task off the board without losing it (rule 10).

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "task", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const historyOf = (taskId: string) =>
  db
    .select({ action: activity.action, before: activity.before, after: activity.after })
    .from(activity)
    .where(and(eq(activity.taskId, taskId)))
    .orderBy(activity.createdAt);

describe("tasks", () => {
  it("numbers tasks per project and records each change", async () => {
    const { projectId, users } = fixture;
    const first = await createTask({ db, actorId: users.ali, projectId, input: { title: " اول " } });
    const second = await createTask({ db, actorId: users.ali, projectId, input: { title: "دوم" } });
    if (first.kind !== "success" || second.kind !== "success") throw new Error("setup failed");
    expect([first.task.number, second.task.number]).toEqual([1, 2]);
    expect(first.task).toMatchObject({ title: "اول", ownerId: users.ali });

    const updated = await updateTask({
      db,
      actor: { id: users.ali, role: "user" },
      projectId,
      taskId: first.task.id,
      input: { title: "اول، بازنویسی", assigneeId: users.reza },
    });
    expect(updated).toMatchObject({ kind: "success", task: { assigneeId: users.reza } });

    expect(await historyOf(first.task.id)).toEqual([
      expect.objectContaining({ action: "task.created" }),
      {
        action: "task.updated",
        before: { title: "اول", assigneeId: null },
        after: { title: "اول، بازنویسی", assigneeId: users.reza },
      },
    ]);
  });

  it("lets only the owner or an admin hand a task over", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.ali, projectId, input: { title: "مالکیت" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;

    const byOther = await updateTask({
      db,
      actor: { id: users.reza, role: "user" },
      projectId,
      taskId,
      input: { ownerId: users.reza },
    });
    expect(byOther).toMatchObject({ kind: "invalid", fields: { ownerId: expect.any(String) } });

    const byAdmin = await updateTask({
      db,
      actor: { id: users.admin, role: "admin" },
      projectId,
      taskId,
      input: { ownerId: users.reza },
    });
    expect(byAdmin).toMatchObject({ kind: "success", task: { ownerId: users.reza } });
  });

  it("takes an archived task off the board and keeps its history", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.ali, projectId, input: { title: "بایگانی" } });
    if (created.kind !== "success") throw new Error("setup failed");

    expect(await archiveTask({ db, actorId: users.ali, projectId, taskId: created.task.id })).toEqual({ kind: "ok" });
    const board = await getBoard({ db, projectId });
    expect(board.tasks.some((task) => task.id === created.task.id)).toBe(false);
    expect(await getTask({ db, projectId, number: created.task.number })).toMatchObject({
      archivedAt: expect.any(Date),
    });
    expect((await historyOf(created.task.id)).map((entry) => entry.action)).toEqual(["task.created", "task.archived"]);
  });

  it("records the columns a move leaves and enters, and never lets two cards share a position", async () => {
    const { projectId, users } = fixture;
    const columns = await findColumns({ db, projectId });
    const todo = columns.find((column) => column.kind === "todo");
    if (!todo) throw new Error("setup failed");

    const a = await createTask({ db, actorId: users.ali, projectId, input: { title: "الف" } });
    const b = await createTask({ db, actorId: users.ali, projectId, input: { title: "ب" } });
    if (a.kind !== "success" || b.kind !== "success") throw new Error("setup failed");

    // Both dropped into the same gap at once: the second gets a key of its own.
    const first = await moveTask({
      db,
      actorId: users.ali,
      projectId,
      taskId: a.task.id,
      columnId: todo.id,
      position: "a0",
    });
    const second = await moveTask({
      db,
      actorId: users.reza,
      projectId,
      taskId: b.task.id,
      columnId: todo.id,
      position: "a0",
    });
    if (first.kind !== "success" || second.kind !== "success") throw new Error("move failed");
    expect(first.task.position).toBe("a0");
    expect(second.task.position).not.toBe("a0");
    expect(second.task.position > first.task.position).toBe(true);

    const [, moved] = await historyOf(a.task.id);
    expect(moved).toMatchObject({
      action: "task.moved",
      before: { columnKind: "backlog" },
      after: { columnId: todo.id, columnKind: "todo" },
    });

    const invalid = await moveTask({
      db,
      actorId: users.ali,
      projectId,
      taskId: a.task.id,
      columnId: todo.id,
      position: "!",
    });
    expect(invalid).toMatchObject({ kind: "invalid" });
  });
});
