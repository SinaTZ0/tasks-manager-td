import { delegateTask, listDelegatedBy } from "#/orpc/delegation/service";
import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";

const noData = { errors: [], fields: {} };

/*===== Delegate =====*/
export const delegateTaskProcedure = base.delegation.delegate
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await delegateTask({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
  });

/*===== Delegated By Me =====*/
export const delegatedByMeProcedure = base.delegation.mine
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => listDelegatedBy({ db: context.db, user: context.user }));
