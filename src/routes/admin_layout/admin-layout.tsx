import { createFileRoute, redirect } from "@tanstack/react-router";

import { roleHomePath } from "#/lib/viewer";

/*===== Guard =====*/
/**
 * The pages below manage the team and its projects, so only admins open them; anyone else goes to their own home.
 * Only shapes navigation: every procedure these pages call checks the role again (`requireRoleMiddleware("admin")`).
 */
export const Route = createFileRoute("/_site-layout/_app-layout/_admin-layout")({
  beforeLoad: ({ context }) => {
    if (context.viewer.role !== "admin") throw redirect({ href: roleHomePath(context.viewer.role) });
  },
});
