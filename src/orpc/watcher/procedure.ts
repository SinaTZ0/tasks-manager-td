import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { setWatching } from "#/orpc/watcher/service";

const noData = { errors: [], fields: {} };

/*===== Watch =====*/
export const watchTaskProcedure = base.watcher.watch
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setWatching({ db: context.db, userId: context.user.id, ...input, watching: true });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    return result.watchers;
  });

/*===== Unwatch =====*/
export const unwatchTaskProcedure = base.watcher.unwatch
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setWatching({ db: context.db, userId: context.user.id, ...input, watching: false });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    return result.watchers;
  });
