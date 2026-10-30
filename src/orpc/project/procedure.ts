import { base } from "#/orpc/implementer.server";
import { requireRoleMiddleware, requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import {
  changeColumn,
  createProject,
  getProject,
  listProjects,
  renameProject,
  setProjectMember,
} from "#/orpc/project/service";

const noData = { errors: [], fields: {} };

/*===== List =====*/
export const listProjectsProcedure = base.project.list
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(({ context }) => listProjects({ db: context.db, viewer: context.user }));

/*===== Get =====*/
export const getProjectProcedure = base.project.get
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const project = await getProject({ db: context.db, viewer: context.user, key: input.key });
    if (!project) throw errors.NOT_FOUND({ data: noData });
    return project;
  });

/*===== Create =====*/
export const createProjectProcedure = base.project.create
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await createProject({ db: context.db, actorId: context.user.id, input });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Rename =====*/
export const renameProjectProcedure = base.project.rename
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await renameProject({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Members =====*/
export const setProjectMemberProcedure = base.project.setMember
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setProjectMember({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Columns =====*/
export const updateColumnProcedure = base.project.updateColumn
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, columnId, ...change } = input;
    const result = await changeColumn({ db: context.db, actorId: context.user.id, projectId, columnId, input: change });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.column;
  });
