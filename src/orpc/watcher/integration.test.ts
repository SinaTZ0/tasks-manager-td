import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { plainTextToRichText } from "#/lib/rich-text";
import { addComment } from "#/orpc/comment/service";
import { listNotifications } from "#/orpc/notification/service";
import { createTask } from "#/orpc/task/service";
import { setWatching } from "#/orpc/watcher/service";

/*===== Watchers =====*/
// Someone watching a card hears about its comments, but never about their own, and nothing once they stop watching.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "watcher", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const watchedKinds = async (userId: string) =>
  (await listNotifications({ db, userId })).items.filter((item) => item.kind === "watched").map((item) => item.event);

describe("watchers", () => {
  it("tells a watcher about others' comments until they unwatch", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.admin, projectId, input: { title: "پیگیری" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;
    const comment = (actorId: string, text: string) =>
      addComment({ db, actorId, projectId, taskId, body: plainTextToRichText(text) });

    const watched = await setWatching({ db, userId: users.reza, projectId, taskId, watching: true });
    expect(watched).toMatchObject({ kind: "success", watchers: [expect.objectContaining({ id: users.reza })] });

    await comment(users.reza, "نظر خودم");
    expect(await watchedKinds(users.reza)).toEqual([]);

    await comment(users.ali, "نظر علی");
    expect(await watchedKinds(users.reza)).toEqual(["commented"]);

    await setWatching({ db, userId: users.reza, projectId, taskId, watching: false });
    await comment(users.admin, "نظر مدیر");
    expect(await watchedKinds(users.reza)).toEqual(["commented"]);

    // Ali's comment made him a watcher: the admin's reached him. The admin owns the card, so isn't added.
    expect(await watchedKinds(users.ali)).toEqual(["commented"]);
    expect(await watchedKinds(users.admin)).toEqual([]);
  });
});
