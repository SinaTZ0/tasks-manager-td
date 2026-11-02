import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { getTaskTime } from "#/orpc/time/service";

const noData = { errors: [], fields: {} };

/*===== Task Time =====*/
export const taskTimeProcedure = base.time.forTask
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const time = await getTaskTime({ db: context.db, projectId: input.projectId, number: input.number });
    if (!time) throw errors.NOT_FOUND({ data: noData });
    return time;
  });
