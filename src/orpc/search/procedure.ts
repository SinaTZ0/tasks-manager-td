import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { rateLimitMiddleware } from "#/orpc/middleware/rate-limit/rate-limit.middleware";
import { searchTasks } from "#/orpc/search/service";

/*===== Tasks =====*/
// A table scan per call: limited more tightly than ordinary reads, though typing is already debounced by the page.
const SEARCH_RATE_LIMIT = { name: "search", limit: 60, windowMs: 60_000 };

export const searchTasksProcedure = base.search.tasks
  .use(rateLimitMiddleware(SEARCH_RATE_LIMIT))
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context, input }) => searchTasks({ db: context.db, user: context.user, q: input.q }));
