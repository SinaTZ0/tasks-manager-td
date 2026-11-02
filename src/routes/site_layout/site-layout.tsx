import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";

import { BoardPanelToggle } from "#/components/shared/board-panel-toggle/board-panel-toggle";
import { HeaderSearch } from "#/components/shared/header-search/header-search";
import { NotificationBell, notificationsQuery } from "#/components/shared/notification-bell/notification-bell";
import { SiteFooter } from "#/components/shared/site-footer/site-footer";
import { ShortcutHelp } from "#/components/shared/shortcut-help/shortcut-help";
import { SiteHeader } from "#/components/shared/site-header/site-header";
import { useLiveUpdates } from "#/hooks/use-live-updates";
import { setReportedUser } from "#/lib/error-reporting.browser";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout")({
  // The header needs the viewer, and a signed-in viewer's notifications, on every page, so they load before any page
  // renders.
  beforeLoad: async ({ context }) => {
    const viewer = await context.queryClient.ensureQueryData(orpc.session.viewer.queryOptions());
    if (viewer) await context.queryClient.ensureQueryData(notificationsQuery());
    return viewer;
  },
  component: SiteLayout,
});

/*===== Site Layout =====*/

/** The chrome shared by every page: skip link, header, `main` landmark and footer. */
function SiteLayout() {
  const { data: viewer } = useSuspenseQuery(orpc.session.viewer.queryOptions());
  const userId = viewer?.id ?? null;

  /*------ Error Reports ------*/
  // Browser reports carry the signed-in user's ID, like the server's (docs/backend/logging.md → User ID). Sign-in and
  // sign-out invalidate the viewer query, which updates it.
  useEffect(() => setReportedUser(userId), [userId]);

  /*------ Live Updates ------*/
  // A signed-in page hears about changes made elsewhere (other people, other tabs) as they happen.
  useLiveUpdates(userId);

  /*------ Page Keys ------*/
  // A board can fold its head panel away; the key sits in the header so it stays in reach with the panel gone.
  const onBoard =
    useMatch({ from: "/_site-layout/_app-layout/projects/$projectKey", shouldThrow: false }) !== undefined;

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-button text-primary-foreground focus:not-sr-only focus:fixed focus:inset-s-4 focus:top-4"
      >
        {m.common_skip_to_content()}
      </a>
      <SiteHeader
        viewer={viewer}
        search={viewer && <HeaderSearch />}
        bell={viewer && <NotificationBell />}
        pageKeys={onBoard && <BoardPanelToggle />}
      />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      {viewer && <ShortcutHelp role={viewer.role} />}
    </div>
  );
}
