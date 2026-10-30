import { useRouteContext } from "@tanstack/react-router";

import { canEdit } from "#/lib/user-constants";

/*===== Board Access =====*/
/**
 * What the signed-in person may do on a board, from their role: an admin everything, a user the everyday work, a
 * viewer nothing but reading. It only shapes the page: every hidden key is refused by the server too
 * (`requireEditorMiddleware`, `requireAdminMiddleware`).
 */
export function useBoardAccess(): { viewerId: string; canEdit: boolean; isAdmin: boolean } {
  const { viewer } = useRouteContext({ from: "/_site-layout/_app-layout" });
  return { viewerId: viewer.id, canEdit: canEdit(viewer.role), isAdmin: viewer.role === "admin" };
}
