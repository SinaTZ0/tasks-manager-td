import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { activity } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { findColumns } from "#/orpc/project/repository";
import { addColumn, removeColumn, setProjectMember } from "#/orpc/project/service";
import {
  archiveTask,
  createTask,
  deleteTask,
  getBoard,
  getTask,
  listMyTasks,
  moveTask,
  restoreTask,
  updateTask,
} from "#/orpc/task/service";

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
    .orderBy(activity.createdAt, activity.seq);

describe("tasks", () => {
  it("numbers tasks per project and records each change", async () => {
    const { projectId, users } = fixture;
    const first = await createTask({ db, actorId: users.ali, projectId, input: { title: " اول " } });
    const second = await createTask({ db, actorId: users.ali, projectId, input: { title: "دوم" } });
    if (first.kind !== "success" || second.kind !== "success") throw new Error("setup failed");
    expect([first.task.number, second.task.number]).toEqual([1, 2]);
    // Its maker is on it from the start (rule 2).
    expect(first.task).toMatchObject({ title: "اول", ownerId: users.ali, assigneeIds: [users.ali] });

    const updated = await updateTask({
      db,
      actor: { id: users.ali, role: "user" },
      projectId,
      taskId: first.task.id,
      input: { title: "اول، بازنویسی", assigneeIds: [users.reza] },
    });
    expect(updated).toMatchObject({ kind: "success", task: { assigneeIds: [users.reza] } });

    expect(await historyOf(first.task.id)).toEqual([
      expect.objectContaining({ action: "task.created" }),
      {
        action: "task.updated",
        before: { title: "اول", assigneeIds: [users.ali] },
        after: { title: "اول، بازنویسی", assigneeIds: [users.reza] },
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
    const board = await getBoard({ db, projectId, viewerId: users.ali });
    expect(board.tasks.some((task) => task.id === created.task.id)).toBe(false);
    expect(await getTask({ db, projectId, number: created.task.number })).toMatchObject({
      archivedAt: expect.any(Date),
    });
    expect((await historyOf(created.task.id)).map((entry) => entry.action)).toEqual(["task.created", "task.archived"]);
  });

  it("records the columns a move leaves and enters, and never lets two cards share a position", async () => {
    const { projectId, users } = fixture;
    const columns = await findColumns({ db, projectId });
    const todo = columns.find((column) => column.kind === "doing");
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
      before: { columnKind: "todo" },
      after: { columnId: todo.id, columnKind: "doing" },
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

  it("keeps a custom column while it holds a card", async () => {
    const { projectId, users } = fixture;
    const added = await addColumn({ db, actorId: users.admin, projectId, name: "آزمون" });
    if (added.kind !== "success") throw new Error("setup failed");
    const columnId = added.column.id;
    const created = await createTask({ db, actorId: users.ali, projectId, input: { title: "در ستون", columnId } });
    if (created.kind !== "success") throw new Error("setup failed");

    const remove = () => removeColumn({ db, actorId: users.admin, projectId, columnId });
    expect(await remove()).toMatchObject({ kind: "invalid" });
    // Archived, the card no longer holds the column: it moves to to do, so a restore still has a column.
    await archiveTask({ db, actorId: users.ali, projectId, taskId: created.task.id });
    expect(await remove()).toEqual({ kind: "ok" });
    const todo = (await findColumns({ db, projectId })).find((column) => column.kind === "todo");
    expect(await getTask({ db, projectId, number: created.task.number })).toMatchObject({ columnId: todo?.id });
  });

  it("restores and hard-deletes an archived task only for an admin (rule 10)", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.ali, projectId, input: { title: "پاک‌شدنی" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;
    const remove = (id: string, role: string) => deleteTask({ db, actor: { id, role }, projectId, taskId });

    expect(await remove(users.admin, "admin")).toMatchObject({ kind: "invalid" });
    await archiveTask({ db, actorId: users.ali, projectId, taskId });
    expect(await remove(users.ali, "user")).toMatchObject({ kind: "invalid" });

    // A member can't bring it back; restored by the admin, it is live again and can't be deleted; archived once more,
    // the admin can.
    const restore = (id: string, role: string) => restoreTask({ db, actor: { id, role }, projectId, taskId });
    expect(await restore(users.ali, "user")).toMatchObject({ kind: "invalid" });
    expect(await restore(users.admin, "admin")).toEqual({ kind: "ok" });
    expect(await getTask({ db, projectId, number: created.task.number })).toMatchObject({ archivedAt: null });
    await archiveTask({ db, actorId: users.ali, projectId, taskId });
    expect(await remove(users.admin, "admin")).toEqual({ kind: "ok" });
    expect(await getTask({ db, projectId, number: created.task.number })).toBeNull();
    expect((await historyOf(taskId)).map((entry) => entry.action)).toContain("task.deleted");
  });

  it("lists my open tasks only from projects I'm still on", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({
      db,
      actorId: users.admin,
      projectId,
      input: { title: "مال رضا", assigneeIds: [users.ali, users.reza] },
    });
    if (created.kind !== "success") throw new Error("setup failed");
    const mine = async () => (await listMyTasks({ db, userId: users.reza })).map((task) => task.id);
    expect(await mine()).toContain(created.task.id);

    await setProjectMember({ db, actorId: users.admin, projectId, userId: users.reza, member: false });
    expect(await mine()).not.toContain(created.task.id);
    await setProjectMember({ db, actorId: users.admin, projectId, userId: users.reza, member: true });
  });
});
