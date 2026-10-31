import { call, ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "#/db/client.server";
import { user } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addCommentProcedure } from "#/orpc/comment/procedure";
import { delegateTaskProcedure } from "#/orpc/delegation/procedure";
import { addDependencyProcedure } from "#/orpc/dependency/procedure";
import { findColumns } from "#/orpc/project/repository";
import {
  archiveTaskProcedure,
  createLabelProcedure,
  createTaskProcedure,
  deleteLabelProcedure,
  moveTaskProcedure,
  taskBoardProcedure,
  updateLabelProcedure,
  updateTaskProcedure,
} from "#/orpc/task/procedure";
import { stopTimerProcedure } from "#/orpc/time/procedure";

/*===== Roles =====*/
// Three levels (docs/task-manager-plan.md → slice 9): an admin does everything, a user can't create or archive a task,
// and a viewer changes nothing and can't be handed work. Checked through the procedures, where the middleware lives.

// The session is the request's: the test names its user in a header instead of a cookie.
vi.mock("#/lib/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#/lib/auth.server")>()),
  getRequestSession: async (headers: Headers) => {
    const id = headers.get("x-test-user");
    if (!id) return null;
    const { db: database } = await import("#/db/client.server");
    const { user: users } = await import("#/db/schema");
    const { eq: equals } = await import("drizzle-orm");
    const [row] = await database.select().from(users).where(equals(users.id, id));
    return row ? { user: row, session: {} } : null;
  },
}));

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "vera">>>;
let taskId: string;
let otherTaskId: string;
let doingId: string;

const as = (userId: string) => ({ context: { headers: new Headers({ "x-test-user": userId }) } });

/** The code a refused call failed with. */
async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return error instanceof ORPCError ? error.code : String(error);
  }
}

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "roles", names: ["admin", "ali", "vera"] });
  await db.update(user).set({ role: "viewer" }).where(eq(user.id, fixture.users.vera));
  const { projectId, users } = fixture;
  const first = await call(createTaskProcedure, { projectId, title: "نقش‌ها" }, as(users.admin));
  const second = await call(createTaskProcedure, { projectId, title: "دیگری" }, as(users.admin));
  taskId = first.id;
  otherTaskId = second.id;
  doingId = (await findColumns({ db, projectId })).find((column) => column.kind === "doing")?.id ?? "";
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

describe("roles", () => {
  it("lets a viewer read but change nothing", async () => {
    const { projectId, users } = fixture;
    const viewer = as(users.vera);
    const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "سلام" }] }] };

    await expect(call(taskBoardProcedure, { projectId }, viewer)).resolves.toMatchObject({ tasks: expect.any(Array) });
    const refused = await Promise.all([
      codeOf(call(updateTaskProcedure, { projectId, taskId, title: "تغییر" }, viewer)),
      codeOf(call(moveTaskProcedure, { projectId, taskId, columnId: doingId, position: "a0" }, viewer)),
      codeOf(call(createLabelProcedure, { projectId, name: "برچسب", color: "teal" }, viewer)),
      codeOf(call(addCommentProcedure, { projectId, taskId, body }, viewer)),
      codeOf(call(addDependencyProcedure, { projectId, taskId, blockerId: otherTaskId }, viewer)),
      codeOf(call(delegateTaskProcedure, { projectId, taskId, toId: users.ali }, viewer)),
      codeOf(call(stopTimerProcedure, undefined, viewer)),
    ]);
    expect(refused).toEqual(Array(refused.length).fill("FORBIDDEN"));
  });

  it("lets only an admin create or archive a task", async () => {
    const { projectId, users } = fixture;
    expect(await codeOf(call(createTaskProcedure, { projectId, title: "از کاربر" }, as(users.ali)))).toBe("FORBIDDEN");
    expect(await codeOf(call(archiveTaskProcedure, { projectId, taskId }, as(users.ali)))).toBe("FORBIDDEN");
    // A user still does the everyday work.
    expect(await codeOf(call(updateTaskProcedure, { projectId, taskId, title: "کار" }, as(users.ali)))).toBe("OK");
  });

  it("lets a user add a label but only an admin rename or delete one", async () => {
    const { projectId, users } = fixture;
    const created = await call(createLabelProcedure, { projectId, name: "فوری", color: "pink" }, as(users.ali));
    await call(updateTaskProcedure, { projectId, taskId, labelIds: [created.id] }, as(users.ali));
    const labelId = created.id;

    const rename = { projectId, labelId, name: "دیگر", color: "pink" } as const;
    expect(await codeOf(call(updateLabelProcedure, rename, as(users.ali)))).toBe("FORBIDDEN");
    expect(await codeOf(call(deleteLabelProcedure, { projectId, labelId }, as(users.ali)))).toBe("FORBIDDEN");

    await call(deleteLabelProcedure, { projectId, labelId }, as(users.admin));
    const board = await call(taskBoardProcedure, { projectId }, as(users.admin));
    expect(board.labels.map((label) => label.id)).not.toContain(labelId);
    expect(board.tasks.find((task) => task.id === taskId)?.labelIds).toEqual([]);
  });

  it("never gives a viewer a task", async () => {
    const { projectId, users } = fixture;
    const assign = call(updateTaskProcedure, { projectId, taskId, assigneeIds: [users.vera] }, as(users.admin));
    expect(await codeOf(assign)).toBe("INVALID_INPUT");
    const own = call(updateTaskProcedure, { projectId, taskId, ownerId: users.vera }, as(users.admin));
    expect(await codeOf(own)).toBe("INVALID_INPUT");
    const delegate = call(delegateTaskProcedure, { projectId, taskId, toId: users.vera }, as(users.ali));
    expect(await codeOf(delegate)).toBe("INVALID_INPUT");
  });
});
