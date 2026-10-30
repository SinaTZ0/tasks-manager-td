import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { listNotifications, markNotificationsRead, remindDue } from "#/orpc/notification/service";

/*===== List =====*/
// Reading the list is when due-date reminders are written: the bell polls, so they arrive without a scheduler.
export const listNotificationsProcedure = base.notification.list
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context }) => {
    await remindDue({ db: context.db, userId: context.user.id });
    return listNotifications({ db: context.db, userId: context.user.id });
  });

/*===== Mark Read =====*/
export const markNotificationsReadProcedure = base.notification.markRead
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context, input }) => markNotificationsRead({ db: context.db, userId: context.user.id, ids: input.ids }));
