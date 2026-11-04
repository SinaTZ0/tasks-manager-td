import { createFileRoute, redirect } from "@tanstack/react-router";

import { NotFoundPage } from "#/components/shared/not-found-page/not-found-page";
import type { UserRole } from "#/lib/user-constants";
import { roleHomePath } from "#/lib/viewer";
import { orpc } from "#/orpc/client";

/** The roles that may open the pages below this layout. */
const ROLES: readonly UserRole[] = ["admin", "user", "viewer"];

/*===== Guard =====*/
/**
 * Every route below this layout needs a signed-in user.
 *
 * - Signed out (or blocked, which `session.viewer` signs out): sign in, then come back to this page, query string included.
 * - A role outside `ROLES`: that role's own home.
 *
 * This guard only shapes navigation. The data is protected where it is served: oRPC procedures check the session and
 * role again (`requireUserMiddleware`, `requireRoleMiddleware`).
 */
export const Route = createFileRoute("/_site-layout/_app-layout")({
  beforeLoad: async ({ context, location }) => {
    const viewer = await context.queryClient.ensureQueryData(orpc.session.viewer.queryOptions());
    if (!viewer) throw redirect({ to: "/auth", search: { redirectTo: location.href } });
    if (!ROLES.includes(viewer.role as UserRole)) throw redirect({ href: roleHomePath(viewer.role) });
    return { viewer };
  },
  // A page below that finds nothing (a project the viewer can't open) says so here, inside the site layout.
  notFoundComponent: NotFoundPage,
});
