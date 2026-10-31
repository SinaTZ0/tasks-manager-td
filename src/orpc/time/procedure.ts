import { base } from "#/orpc/implementer.server";
import { requireEditorMiddleware, requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { getRunningTimer, getTaskTime, stopRunningTimer } from "#/orpc/time/service";

const noData = { errors: [], fields: {} };

/*===== Running Timer =====*/
export const currentTimerProcedure = base.time.current
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => getRunningTimer({ db: context.db, userId: context.user.id }));

export const stopTimerProcedure = base.time.stop
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => stopRunningTimer({ db: context.db, actorId: context.user.id }));

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
