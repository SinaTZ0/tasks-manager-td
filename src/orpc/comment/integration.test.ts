import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { addComment, editComment, listComments, pingTask, removeComment } from "#/orpc/comment/service";
import { listNotifications } from "#/orpc/notification/service";
import { updateProfile } from "#/orpc/profile/service";
import { findColumnByKind } from "#/orpc/task/repository";
import { createTask, moveTask } from "#/orpc/task/service";
import { m } from "#/paraglide/messages";

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

/*===== Pings =====*/
const startTask = async (title: string) => {
  const { projectId, users } = fixture;
  const created = await createTask({
    db,
    actorId: users.admin,
    projectId,
    input: { title, assigneeIds: [users.reza] },
  });
  if (created.kind !== "success") throw new Error("setup failed");
  return created.task.id;
};
const moveTo = async ({ taskId, kind }: { taskId: string; kind: string }) => {
  const { projectId, users } = fixture;
  const column = await findColumnByKind({ db, projectId, kind });
  const moved = await moveTask({ db, actorId: users.admin, projectId, taskId, columnId: column.id, position: "a0" });
  if (moved.kind !== "success") throw new Error("setup failed");
};

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("pings", () => {
  it("posts the pinger's own words, or the default, and tells the people on the card", async () => {
    const { projectId, users } = fixture;
    const taskId = await startTask("پینگ پیش‌فرض");
    await moveTo({ taskId, kind: "doing" });

    expect(await pingTask({ db, actorId: users.ali, projectId, taskId })).toMatchObject({ kind: "success" });
    const saved = await updateProfile({
      db,
      userId: users.ali,
      input: { name: "علی", avatarMediaId: null, pingMessage: "  به کجا رسید؟ " },
    });
    expect(saved).toMatchObject({ kind: "success", profile: { pingMessage: "به کجا رسید؟" } });
    expect(await pingTask({ db, actorId: users.ali, projectId, taskId })).toMatchObject({ kind: "success" });

    const thread = await listComments({ db, projectId, taskId });
    expect(thread.map((comment) => comment.body)).toEqual([
      paragraph(m.comment_ping_default()),
      paragraph("به کجا رسید؟"),
    ]);

    const told = await listNotifications({ db, userId: users.reza });
    expect(told.items.filter((item) => item.event === "commented" && item.taskTitle === "پینگ پیش‌فرض")).toHaveLength(
      2,
    );
  });

  it("is refused where no work is under way", async () => {
    const { projectId, users } = fixture;
    const taskId = await startTask("هنوز شروع نشده");

    expect(await pingTask({ db, actorId: users.ali, projectId, taskId })).toMatchObject({ kind: "invalid" });
    await moveTo({ taskId, kind: "done" });
    expect(await pingTask({ db, actorId: users.ali, projectId, taskId })).toMatchObject({ kind: "invalid" });
    expect(await listComments({ db, projectId, taskId })).toEqual([]);
  });
});
