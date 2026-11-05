import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { plainTextToRichText } from "#/lib/rich-text";
import { addComment } from "#/orpc/comment/service";
import { listNotifications } from "#/orpc/notification/service";
import { findColumnByKind } from "#/orpc/task/repository";
import { archiveTask, createTask, moveTask, transitionTask, updateTask } from "#/orpc/task/service";
import { setWatching } from "#/orpc/watcher/service";

/*===== Watchers =====*/
// Someone watching a card hears about its comments, but never about their own, and nothing once they stop watching.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza" | "sara">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "watcher", names: ["admin", "ali", "reza", "sara"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const watchedKinds = async (userId: string) =>
  (await listNotifications({ db, userId })).items.filter((item) => item.kind === "watched").map((item) => item.event);

/** What a person heard about one card, oldest first. */
const heardAbout = async ({ userId, title }: { userId: string; title: string }) =>
  (await listNotifications({ db, userId })).items
    .filter((item) => item.kind === "watched" && item.taskTitle === title)
    .map((item) => item.event)
    .toReversed();

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

    // Ali's comment made him a watcher: the admin's reached him. The admin owns the card and heard Reza and Ali, but
    // not themselves.
    expect(await watchedKinds(users.ali)).toEqual(["commented"]);
    expect(await watchedKinds(users.admin)).toEqual(["commented", "commented"]);
  });

  it("tells a card's assignees about others' comments without their watching", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.admin, projectId, input: { title: "تحویل" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;
    await updateTask({
      db,
      actor: { id: users.admin, role: "admin" },
      projectId,
      taskId,
      input: { assigneeIds: [users.admin, users.sara] },
    });
    const comment = (actorId: string, text: string) =>
      addComment({ db, actorId, projectId, taskId, body: plainTextToRichText(text) });

    await comment(users.admin, "کار چطور پیش می‌رود؟");
    expect(await watchedKinds(users.sara)).toEqual(["commented"]);

    await comment(users.sara, "خوب است");
    expect(await watchedKinds(users.sara)).toEqual(["commented"]);
  });

  it("tells a card's owner and assignees what someone else does to it, once each", async () => {
    const { projectId, users } = fixture;
    const title = "جابه‌جایی";
    const created = await createTask({
      db,
      actorId: users.admin,
      projectId,
      input: { title, assigneeIds: [users.ali] },
    });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;

    const doing = await findColumnByKind({ db, projectId, kind: "doing" });
    await moveTask({ db, actorId: users.reza, projectId, taskId, columnId: doing.id, position: "a0" });
    // Reordering in the same column is no news.
    await moveTask({ db, actorId: users.reza, projectId, taskId, columnId: doing.id, position: "a1" });
    await transitionTask({ db, actorId: users.reza, projectId, taskId, action: "done" });
    await archiveTask({ db, actorId: users.reza, projectId, taskId });

    const events = ["moved", "completed", "archived"];
    expect(await heardAbout({ userId: users.ali, title })).toEqual(events);
    expect(await heardAbout({ userId: users.admin, title })).toEqual(events);
    // The one who did it hears nothing, and neither does someone with no part in the card.
    expect(await heardAbout({ userId: users.reza, title })).toEqual([]);
    expect(await heardAbout({ userId: users.sara, title })).toEqual([]);
  });
});
