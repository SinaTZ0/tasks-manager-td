import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { notificationsQuery } from "#/components/shared/notification-bell/notification-bell";
import { SignInForm } from "#/components/shared/sign-in-form/sign-in-form";
import { useLiveUpdates } from "#/hooks/use-live-updates";
import { remindersQuery } from "#/hooks/use-reminders";
import { authClient } from "#/lib/auth-client";
import { setReportedUser } from "#/lib/error-reporting.browser";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";

import { tellShell } from "./bridge";
import { Channels } from "./components/channels";

/** How often the page asks for the session again, so the cookie is renewed while the widget just sits there. */
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000;

/*===== Route =====*/
export const Route = createFileRoute("/widget")({
  loader: async ({ context }) => {
    const viewer = await context.queryClient.ensureQueryData(orpc.session.viewer.queryOptions());
    if (!viewer) return;
    await Promise.all([
      context.queryClient.ensureQueryData(notificationsQuery()),
      context.queryClient.ensureQueryData(orpc.task.mine.queryOptions()),
      context.queryClient.ensureQueryData(remindersQuery()),
    ]);
  },
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.widget_title(), index: false }),
  component: WidgetPage,
});

/*===== Page =====*/

/**
 * The page inside the desktop widget (docs/desktop.md). It has its own guard: a signed-out person signs in right here,
 * since `/auth` has the full header and the window is small.
 */
function WidgetPage() {
  const { data: viewer } = useSuspenseQuery(orpc.session.viewer.queryOptions());
  const userId = viewer?.id ?? null;

  useEffect(() => setReportedUser(userId), [userId]);
  useLiveUpdates(userId);

  /*------ Session ------*/
  // Server code reads the session in-process, which can't renew the browser's cookie. Only Better-Auth's own endpoint
  // does, and a page that stays open for weeks would otherwise be signed out when the cookie's first week ends.
  useEffect(() => {
    if (!userId) return;
    void authClient.getSession();
    const timer = setInterval(() => void authClient.getSession(), SESSION_REFRESH_MS);
    return () => clearInterval(timer);
  }, [userId]);

  return viewer ? <Channels canHaveTasks={viewer.role !== "viewer"} /> : <SignIn />;
}

/*===== Sign In =====*/

function SignIn() {
  const queryClient = useQueryClient();

  useEffect(() => tellShell({ type: "size", mode: "open" }), []);

  return (
    <main data-widget className="h-svh bg-card surface-grain p-4 text-card-foreground">
      <SignInForm onSuccess={() => void queryClient.invalidateQueries({ queryKey: orpc.session.viewer.key() })} />
    </main>
  );
}
