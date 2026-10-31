import { base } from "#/orpc/implementer.server";
import { requireAdminMiddleware, requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import {
  addColumn,
  changeColumn,
  createProject,
  getProject,
  listProjects,
  moveColumn,
  removeColumn,
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
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await createProject({ db: context.db, actorId: context.user.id, input });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Rename =====*/
export const renameProjectProcedure = base.project.rename
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await renameProject({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Members =====*/
export const setProjectMemberProcedure = base.project.setMember
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setProjectMember({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.project;
  });

/*===== Columns =====*/
export const updateColumnProcedure = base.project.updateColumn
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, columnId, ...change } = input;
    const result = await changeColumn({ db: context.db, actorId: context.user.id, projectId, columnId, input: change });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.column;
  });

export const moveColumnProcedure = base.project.moveColumn
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await moveColumn({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
    return result.column;
  });

export const addColumnProcedure = base.project.addColumn
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addColumn({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.column;
  });

export const removeColumnProcedure = base.project.removeColumn
  .use(requireAdminMiddleware)
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await removeColumn({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
  });
