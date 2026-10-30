import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import {
  archiveTask,
  createLabel,
  createTask,
  getBoard,
  getTask,
  moveTask,
  transitionTask,
  updateTask,
} from "#/orpc/task/service";

const noData = { errors: [], fields: {} };

/*===== Board =====*/
export const taskBoardProcedure = base.task.board
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) => getBoard({ db: context.db, projectId: input.projectId }));

/*===== Get =====*/
export const getTaskProcedure = base.task.get
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const task = await getTask({ db: context.db, projectId: input.projectId, number: input.number });
    if (!task) throw errors.NOT_FOUND({ data: noData });
    return task;
  });

/*===== Create =====*/
export const createTaskProcedure = base.task.create
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, ...fields } = input;
    const result = await createTask({ db: context.db, actorId: context.user.id, projectId, input: fields });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.task;
  });

/*===== Update =====*/
export const updateTaskProcedure = base.task.update
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, taskId, ...fields } = input;
    const result = await updateTask({ db: context.db, actor: context.user, projectId, taskId, input: fields });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.task;
  });

/*===== Move =====*/
export const moveTaskProcedure = base.task.move
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await moveTask({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.task;
  });

/*===== Status =====*/
export const transitionTaskProcedure = base.task.transition
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await transitionTask({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.task;
  });

/*===== Archive =====*/
export const archiveTaskProcedure = base.task.archive
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await archiveTask({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
  });

/*===== Labels =====*/
export const createLabelProcedure = base.task.createLabel
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { projectId, ...fields } = input;
    const result = await createLabel({ db: context.db, actorId: context.user.id, projectId, input: fields });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.label;
  });
