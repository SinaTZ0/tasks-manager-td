import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject, testProjectKey } from "#/db/test-fixtures.server";
import { createProject } from "#/orpc/project/service";
import { searchTasks } from "#/orpc/search/service";
import { createTask } from "#/orpc/task/service";

/*===== Search =====*/
// Search reaches across projects, so it must keep to the ones the person is on (docs/task-manager-plan.md → slice 11).

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali">>>;
let otherProjectId: string;
let otherKey: string;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "search", names: ["admin", "ali"] });
  // A second project with only the admin on it.
  otherKey = testProjectKey();
  const other = await createProject({
    db,
    actorId: fixture.users.admin,
    input: { name: otherKey, key: otherKey, memberIds: [fixture.users.admin] },
  });
  if (other.kind !== "success") throw new Error("setup failed");
  otherProjectId = other.project.id;
});

afterAll(async () => {
  await deleteTestProject({
    db,
    projectId: fixture.projectId,
    extraProjectIds: [otherProjectId],
    userIds: Object.values(fixture.users),
  });
  await db.$client.end();
});

describe("search", () => {
  it("never returns a task from a project I'm not on", async () => {
    const { projectId, users } = fixture;
    const word = `کلید${crypto.randomUUID().slice(0, 6)}`;
    const mine = await createTask({ db, actorId: users.admin, projectId, input: { title: `کار ${word}` } });
    const theirs = await createTask({ db, actorId: users.admin, projectId: otherProjectId, input: { title: word } });
    if (mine.kind !== "success" || theirs.kind !== "success") throw new Error("setup failed");

    const ali = { id: users.ali, role: "user" };
    // Typed with an Arabic kaf and yeh, as from an Arabic keyboard: matches the Persian letters stored.
    const typed = word.replace("ک", "ك").replace("ی", "ي");
    expect((await searchTasks({ db, user: ali, q: typed })).map((result) => result.id)).toEqual([mine.task.id]);
    expect(await searchTasks({ db, user: ali, q: `${otherKey}-${theirs.task.number}` })).toEqual([]);

    // An admin sees every project.
    const admin = { id: users.admin, role: "admin" };
    expect((await searchTasks({ db, user: admin, q: word })).map((result) => result.id)).toHaveLength(2);
  });
});
