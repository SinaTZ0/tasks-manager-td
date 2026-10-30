import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { getProfile, updateProfile } from "#/orpc/profile/service";

/*===== Get =====*/
export const getProfileProcedure = base.profile.get
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => getProfile({ db: context.db, userId: context.user.id }));

/*===== Update =====*/
export const updateProfileProcedure = base.profile.update
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await updateProfile({ db: context.db, userId: context.user.id, input });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.profile;
  });
