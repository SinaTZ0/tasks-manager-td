import { errorDataSchema } from "#/orpc/errors";

/*===== Project Access Errors =====*/
// Browser-safe: declared on every contract whose procedure uses `requireProjectMemberMiddleware`. A project the viewer
// isn't on answers the same as one that doesn't exist.
export const projectAccessErrors = {
  NOT_FOUND: {
    message: "Not found.",
    data: errorDataSchema,
  },
};
