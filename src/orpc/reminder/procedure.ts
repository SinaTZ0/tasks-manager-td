import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { clearReminder, listReminders, setReminder } from "#/orpc/reminder/service";

/*===== Mine =====*/
export const myRemindersProcedure = base.reminder.mine
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => listReminders({ db: context.db, user: context.user }));

/*===== Set =====*/
export const setReminderProcedure = base.reminder.set
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, taskId, ...fields } = input;
    const result = await setReminder({ db: context.db, userId: context.user.id, projectId, taskId, input: fields });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
  });

/*===== Clear =====*/
export const clearReminderProcedure = base.reminder.clear
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) => clearReminder({ db: context.db, userId: context.user.id, taskId: input.taskId }));
