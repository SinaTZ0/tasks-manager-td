import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { subscribePush, unsubscribePush } from "#/orpc/push/service";
import { vapidKeys } from "#/orpc/push/vapid.server";

/*===== Config =====*/
export const pushConfigProcedure = base.push.config
  .use(requireUserMiddleware)
  .handler(() => ({ publicKey: vapidKeys().publicKey }));

/*===== Subscribe =====*/
export const subscribePushProcedure = base.push.subscribe
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input }) => {
    await subscribePush({ db: context.db, userId: context.user.id, ...input });
  });

/*===== Unsubscribe =====*/
export const unsubscribePushProcedure = base.push.unsubscribe
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input }) => {
    await unsubscribePush({ db: context.db, userId: context.user.id, endpoint: input.endpoint });
  });
