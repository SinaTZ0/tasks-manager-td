import { addChecklistItem, moveChecklistItem, removeChecklistItem, editChecklistItem } from "#/orpc/checklist/service";
import { base } from "#/orpc/implementer.server";
import { requireEditorMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";

const noData = { errors: [], fields: {} };

/*===== Add =====*/
export const addChecklistItemProcedure = base.checklist.add
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addChecklistItem({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.item;
  });

/*===== Update =====*/
export const updateChecklistItemProcedure = base.checklist.update
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await editChecklistItem({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.item;
  });

/*===== Move =====*/
export const moveChecklistItemProcedure = base.checklist.move
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await moveChecklistItem({ db: context.db, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
  });

/*===== Remove =====*/
export const removeChecklistItemProcedure = base.checklist.remove
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await removeChecklistItem({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
  });
