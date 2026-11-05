import { base } from "#/orpc/implementer.server";
import { requireAdminMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { addMember, changeMember, listTeam, resetMemberPassword } from "#/orpc/team/service";

/*===== List =====*/
export const listTeamProcedure = base.team.list
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => listTeam({ db: context.db }));

/*===== Create =====*/
export const createTeamMemberProcedure = base.team.create
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addMember({ db: context.db, actorId: context.user.id, input });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.member;
  });

/*===== Role =====*/
export const setTeamMemberRoleProcedure = base.team.setRole
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await changeMember({
      db: context.db,
      actorId: context.user.id,
      userId: input.userId,
      change: { role: input.role },
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "conflict") throw errors.CONFLICT({ data: { errors: [result.message], fields: {} } });
    return result.member;
  });

/*===== Status =====*/
export const setTeamMemberStatusProcedure = base.team.setStatus
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await changeMember({
      db: context.db,
      actorId: context.user.id,
      userId: input.userId,
      change: { status: input.status },
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "conflict") throw errors.CONFLICT({ data: { errors: [result.message], fields: {} } });
    return result.member;
  });

/*===== Password =====*/
export const resetTeamMemberPasswordProcedure = base.team.resetPassword
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await resetMemberPassword({ db: context.db, actorId: context.user.id, input });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "conflict") throw errors.CONFLICT({ data: { errors: [result.message], fields: {} } });
  });
