import { base } from "#/orpc/implementer.server";
import { requireEditorMiddleware, requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { addTimeEntry, getRunningTimer, getTaskTime, removeTimeEntry, stopRunningTimer } from "#/orpc/time/service";

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

/*===== Manual Entries =====*/
export const addTimeEntryProcedure = base.time.add
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, ...entry } = input;
    const result = await addTimeEntry({ db: context.db, actorId: context.user.id, projectId, input: entry });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.log;
  });

export const removeTimeEntryProcedure = base.time.remove
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await removeTimeEntry({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
  });
