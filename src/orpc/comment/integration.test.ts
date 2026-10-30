import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addComment, editComment, listComments, removeComment } from "#/orpc/comment/service";
import { listNotifications } from "#/orpc/notification/service";
import { createTask } from "#/orpc/task/service";

/*===== Comments =====*/
// A comment is its author's: nobody else can change or delete it (docs/app.md → Comments). A mention tells the person.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "comment", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const doc = (text: string, mention?: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text },
        ...(mention
          ? [
              { type: "text", text: " " },
              { type: "mention", attrs: { id: mention, label: "رضا" } },
            ]
          : []),
      ],
    },
  ],
});

describe("comments", () => {
  it("can't be edited or deleted by anyone but its author", async () => {
    const { projectId, users } = fixture;
    const created = await createTask({ db, actorId: users.ali, projectId, input: { title: "طراحی فرم" } });
    if (created.kind !== "success") throw new Error("setup failed");
    const taskId = created.task.id;

    const added = await addComment({
      db,
      actorId: users.ali,
      projectId,
      taskId,
      body: doc("نسخه اول آماده شد", users.reza),
    });
    if (added.kind !== "success") throw new Error("comment not added");
    const commentId = added.comment.id;

    // Even an admin can't put words in Ali's mouth.
    expect(await editComment({ db, actorId: users.admin, projectId, commentId, body: doc("تغییر") })).toMatchObject({
      kind: "invalid",
    });
    expect(await removeComment({ db, actorId: users.reza, projectId, commentId })).toMatchObject({ kind: "invalid" });
    expect(await editComment({ db, actorId: users.ali, projectId, commentId, body: doc("نسخه دوم") })).toMatchObject({
      kind: "success",
      comment: { editedAt: expect.any(Date) },
    });

    const [thread] = await listComments({ db, projectId, taskId });
    expect(thread?.body).toEqual(doc("نسخه دوم"));

    const mentioned = await listNotifications({ db, userId: users.reza });
    expect(mentioned.items).toEqual([expect.objectContaining({ kind: "mentioned", taskTitle: "طراحی فرم" })]);
  });
});
