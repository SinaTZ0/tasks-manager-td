import { getProjectHistory, getTaskHistory } from "#/orpc/activity/service";
import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";

/*===== Task History =====*/
export const taskActivityProcedure = base.activity.forTask
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) => getTaskHistory({ db: context.db, ...input }));

/*===== Project History =====*/
export const projectActivityProcedure = base.activity.forProject
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) =>
    getProjectHistory({ db: context.db, projectId: input.projectId, before: input.before }),
  );
