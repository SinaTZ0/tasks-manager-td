import { addFileAttachment, addLinkAttachment, removeAttachment } from "#/orpc/attachment/service";
import { base } from "#/orpc/implementer.server";
import { requireEditorMiddleware } from "#/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "#/orpc/middleware/db/db.middleware";
import { requireProjectMemberMiddleware } from "#/orpc/middleware/project-access/project-access.middleware";
import { rateLimitMiddleware } from "#/orpc/middleware/rate-limit/rate-limit.middleware";

const noData = { errors: [], fields: {} };

/*===== Add File =====*/
// Each upload carries up to 20 MB and may be decoded by sharp for its preview, so it gets a far lower limit than the
// API's, like a picture's upload.
const UPLOAD_RATE_LIMIT = { name: "attachment-upload", limit: 30, windowMs: 60_000 };

export const addFileAttachmentProcedure = base.attachment.addFile
  .use(rateLimitMiddleware(UPLOAD_RATE_LIMIT))
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addFileAttachment({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.attachment;
  });

/*===== Add Link =====*/
export const addLinkAttachmentProcedure = base.attachment.addLink
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addLinkAttachment({ db: context.db, actorId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: [], fields: result.fields } });
    return result.attachment;
  });

/*===== Remove =====*/
export const removeAttachmentProcedure = base.attachment.remove
  .use(requireEditorMiddleware)
  .use(provideDbMiddleware)
  .use(requireProjectMemberMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await removeAttachment({ db: context.db, actor: context.user, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors ?? [], fields: result.fields } });
    }
  });
