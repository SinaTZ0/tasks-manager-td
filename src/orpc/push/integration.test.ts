import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client.server";
import { pushSubscription } from "#/db/schema";
import { createTestProject, deleteTestProject } from "#/db/test-fixtures.server";
import { notify } from "#/orpc/notification/service";
import { deliverPush, subscribePush, type PushTarget } from "#/orpc/push/service";
import { createTask } from "#/orpc/task/service";

/*===== Push =====*/
// A notification reaches the person's own browsers, in each one's language, and nobody else's; a browser the push
// service says is gone is forgotten.

let fixture: Awaited<ReturnType<typeof createTestProject<"admin" | "ali" | "reza">>>;

beforeAll(async () => {
  fixture = await createTestProject({ db, prefix: "push", names: ["admin", "ali", "reza"] });
});

afterAll(async () => {
  await deleteTestProject({ db, projectId: fixture.projectId, userIds: Object.values(fixture.users) });
  await db.$client.end();
});

const keys = { p256dh: "key", auth: "auth" };
const endpoint = (name: string) => `https://push.example.test/${name}-${fixture.key}`;

describe("push", () => {
  it("sends a notification to the person's browsers and forgets a gone one", async () => {
    const { projectId, users, key } = fixture;
    await subscribePush({ db, userId: users.ali, endpoint: endpoint("ali-laptop"), keys, locale: "en" });
    await subscribePush({ db, userId: users.ali, endpoint: endpoint("ali-old"), keys, locale: "fa" });
    await subscribePush({ db, userId: users.reza, endpoint: endpoint("reza"), keys, locale: "fa" });

    const created = await createTask({ db, actorId: users.admin, projectId, input: { title: "انتشار" } });
    if (created.kind !== "success") throw new Error("setup failed");
    await notify({
      db,
      actorId: users.admin,
      entries: [
        {
          userId: users.ali,
          kind: "assigned",
          projectId,
          taskId: created.task.id,
          data: { projectKey: key, taskCode: `${key}-1`, taskTitle: "انتشار" },
        },
      ],
    });

    const sent: { endpoint: string; payload: { title: string; url: string } }[] = [];
    const send = async (target: PushTarget, payload: string) => {
      if (target.endpoint === endpoint("ali-old")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      sent.push({ endpoint: target.endpoint, payload: JSON.parse(payload) });
    };

    expect(await deliverPush({ db, userId: users.ali, send })).toMatchObject({ sent: 1, removed: 1 });
    expect(sent).toEqual([
      {
        endpoint: endpoint("ali-laptop"),
        payload: expect.objectContaining({
          title: `${users.admin} assigned you ${key}-1`,
          url: `/en/projects/${key}?task=${key}-1`,
        }),
      },
    ]);
    expect(await deliverPush({ db, userId: users.reza, send })).toMatchObject({ sent: 0 });
    // Claimed once: asking again sends nothing.
    expect(await deliverPush({ db, userId: users.ali, send })).toMatchObject({ sent: 0 });

    const left = await db
      .select({ endpoint: pushSubscription.endpoint })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, users.ali));
    expect(left).toEqual([{ endpoint: endpoint("ali-laptop") }]);
  });
});
