import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { project, user } from "#/db/schema";
import { deleteTestActivity } from "#/db/test-cleanup.server";
import { SYSTEM_COLUMN_KINDS } from "#/orpc/project/constants";
import {
  addColumn,
  createProject,
  getProject,
  listProjects,
  moveColumn,
  removeColumn,
  setProjectMember,
} from "#/orpc/project/service";

/*===== Projects =====*/
// A member sees only their own projects; a project they aren't on looks exactly like a missing one.

const runId = randomUUID().slice(0, 8);
const admin = `test-project-admin-${runId}`;
const member = `test-project-member-${runId}`;
const stranger = `test-project-stranger-${runId}`;
// Keys are 2–5 capitals; derived from the run so parallel runs don't collide.
const key = `Q${runId
  .replace(/[^a-f]/g, "")
  .toUpperCase()
  .padEnd(4, "X")
  .slice(0, 4)}`;
const projectIds: string[] = [];

beforeAll(async () => {
  await db.insert(user).values([
    { id: admin, name: "Admin", email: `${admin}@example.test`, role: "admin" },
    { id: member, name: "Member", email: `${member}@example.test` },
    { id: stranger, name: "Stranger", email: `${stranger}@example.test` },
  ]);
});

afterAll(async () => {
  await deleteTestActivity({ db, actorIds: [admin] });
  await db.delete(project).where(inArray(project.id, projectIds));
  await db.delete(user).where(inArray(user.id, [admin, member, stranger]));
  await db.$client.end();
});

describe("projects", () => {
  it("creates a project with its system columns, open only to its members and admins", async () => {
    const created = await createProject({ db, actorId: admin, input: { name: " تفنگ ", key, memberIds: [member] } });
    if (created.kind !== "success") throw new Error("setup failed");
    projectIds.push(created.project.id);
    expect(created.project).toMatchObject({ name: "تفنگ", key, members: [{ id: member }] });

    const asMember = await getProject({ db, viewer: { id: member, role: "user" }, key });
    expect(asMember?.columns.map((column) => column.kind)).toEqual([...SYSTEM_COLUMN_KINDS]);
    expect(await getProject({ db, viewer: { id: admin, role: "admin" }, key })).not.toBeNull();

    expect(await getProject({ db, viewer: { id: stranger, role: "user" }, key })).toBeNull();
    const strangersList = await listProjects({ db, viewer: { id: stranger, role: "user" } });
    expect(strangersList.some((item) => item.key === key)).toBe(false);
  });

  it("adds custom columns before done and keeps the fixed ones in place", async () => {
    const [projectId] = projectIds;
    if (!projectId) throw new Error("setup failed");
    const added = await addColumn({ db, actorId: admin, projectId, name: "بازبینی" });
    if (added.kind !== "success") throw new Error("add failed");
    const kinds = async () =>
      (await getProject({ db, viewer: { id: admin, role: "admin" }, key }))?.columns.map((column) => column.kind);
    expect(await kinds()).toEqual(["todo", "doing", "custom", "done", "cancelled"]);
    expect(await addColumn({ db, actorId: admin, projectId, name: " " })).toMatchObject({ kind: "invalid" });

    const columns = (await getProject({ db, viewer: { id: admin, role: "admin" }, key }))?.columns ?? [];
    const doing = columns.find((column) => column.kind === "doing");
    if (!doing) throw new Error("setup failed");
    const fixed = { db, actorId: admin, projectId, columnId: doing.id };
    expect(await moveColumn({ ...fixed, position: "Zz" })).toMatchObject({ kind: "invalid" });
    expect(await removeColumn(fixed)).toMatchObject({ kind: "invalid" });

    expect(await removeColumn({ db, actorId: admin, projectId, columnId: added.column.id })).toEqual({ kind: "ok" });
    expect(await kinds()).toEqual([...SYSTEM_COLUMN_KINDS]);
  });

  it("refuses a key another project uses", async () => {
    const again = await createProject({ db, actorId: admin, input: { name: "دوباره", key, memberIds: [] } });
    expect(again).toMatchObject({ kind: "invalid", fields: { key: expect.any(String) } });
  });

  it("lets a removed member's access go with them", async () => {
    const [projectId] = projectIds;
    if (!projectId) throw new Error("setup failed");
    await setProjectMember({ db, actorId: admin, projectId, userId: member, member: false });
    expect(await getProject({ db, viewer: { id: member, role: "user" }, key })).toBeNull();
  });
});
