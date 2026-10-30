import { and, eq } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { project, projectMember } from "#/db/schema";
import type { LiveEvent } from "#/orpc/live/contract";
import { listenLive } from "#/orpc/live/listener.server";
import type { LiveSignal } from "#/orpc/live/publish";

/*===== Visibility =====*/
/** Whether the user may open the project: a member, or an admin (who sees every project, as `requireProjectMember`). */
async function canSeeProject({
  db,
  user,
  projectId,
}: {
  db: Database;
  user: { id: string; role?: string | null | undefined };
  projectId: string;
}): Promise<boolean> {
  const [row] =
    user.role === "admin"
      ? await db.select({ id: project.id }).from(project).where(eq(project.id, projectId)).limit(1)
      : await db
          .select({ id: projectMember.projectId })
          .from(projectMember)
          .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, user.id)))
          .limit(1);
  return row !== undefined;
}

/*===== Stream =====*/
/**
 * The viewer's events until `signal` aborts (the page closed the stream): `ready` first, then each change in a project
 * they can open and each of their own notifications. Membership is checked per signal, against the database, so
 * someone taken off a project stops hearing about it at once. A lost database connection is told as another `ready`.
 */
export async function* streamLiveEvents({
  db,
  user,
  signal,
}: {
  db: Database;
  user: { id: string; role?: string | null | undefined };
  signal: AbortSignal;
}): AsyncGenerator<LiveEvent> {
  const queue: ({ kind: "signal"; signal: LiveSignal } | { kind: "lost" })[] = [];
  let wake: (() => void) | null = null;
  listenLive({
    signal,
    onEvent: (event) => {
      queue.push(event);
      wake?.();
    },
  });

  yield { type: "ready" };
  while (!signal.aborted) {
    if (queue.length === 0) {
      await new Promise<void>((resolve) => {
        wake = resolve;
        signal.addEventListener("abort", () => resolve(), { once: true });
      });
      wake = null;
    }
    for (let event = queue.shift(); event && !signal.aborted; event = queue.shift()) {
      if (event.kind === "lost") yield { type: "ready" };
      else if (event.signal.kind === "notification") {
        if (event.signal.id === user.id) yield { type: "notification" };
      } else if (await canSeeProject({ db, user, projectId: event.signal.id })) {
        yield { type: "project", projectId: event.signal.id };
      }
    }
  }
}
