import { base } from "#/orpc/implementer.server";
import { streamLiveEvents } from "#/orpc/live/service";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";

/*===== Events =====*/
// Any signed-in person, viewers included: they read the boards too.
export const liveEventsProcedure = base.live.events
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async function* ({ context, signal }) {
    // Aborted when the page closes the stream; a call without one (a test) ends when its own signal does.
    const controller = new AbortController();
    signal?.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      yield* streamLiveEvents({ db: context.db, user: context.user, signal: controller.signal });
    } finally {
      controller.abort();
    }
  });
