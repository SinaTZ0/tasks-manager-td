import { base } from "#/orpc/implementer.server";
import { requireAdminMiddleware, requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { copyTaskToProject, moveTaskToProject, resolveOldCode } from "#/orpc/transfer/service";

const noData = { errors: [], fields: {} };

/*===== Move =====*/
export const moveTaskToProjectProcedure = base.transfer.move
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await moveTaskToProject({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
    return { projectKey: result.projectKey, number: result.number };
  });

/*===== Copy =====*/
export const copyTaskToProjectProcedure = base.transfer.copy
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await copyTaskToProject({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
    return { projectKey: result.projectKey, number: result.number };
  });

/*===== Resolve =====*/
export const resolveOldCodeProcedure = base.transfer.resolve
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) => resolveOldCode({ db: context.db, actor: context.user, ...input }));
