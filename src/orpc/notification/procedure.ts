import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { listNotifications, markNotificationsRead } from "#/orpc/notification/service";

/*===== List =====*/
export const listNotificationsProcedure = base.notification.list
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => listNotifications({ db: context.db, userId: context.user.id }));

/*===== Mark Read =====*/
export const markNotificationsReadProcedure = base.notification.markRead
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context, input }) => markNotificationsRead({ db: context.db, userId: context.user.id, ids: input.ids }));
