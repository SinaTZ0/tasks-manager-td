import { addComment, editComment, listComments, removeComment } from "#/orpc/comment/service";
import { base } from "#/orpc/implementer.server";
import { requireUserMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";

const noData = { errors: [], fields: {} };

/*===== List =====*/
export const listCommentsProcedure = base.comment.list
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(({ context, input }) => listComments({ db: context.db, ...input }));

/*===== Add =====*/
export const addCommentProcedure = base.comment.add
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addComment({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
    return result.comment;
  });

/*===== Edit =====*/
export const editCommentProcedure = base.comment.edit
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await editComment({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
    return result.comment;
  });

/*===== Remove =====*/
export const removeCommentProcedure = base.comment.remove
  .use(requireUserMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await removeComment({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
  });
