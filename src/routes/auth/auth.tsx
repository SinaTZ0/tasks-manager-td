import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { redirectToParam } from "#/lib/search-params";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { SignInForm } from "#/components/shared/sign-in-form/sign-in-form";

/** Where people land after signing in when nothing asked for a page. */
const DEFAULT_REDIRECT = "/";

const searchSchema = z.object({
  redirectTo: redirectToParam,
});

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/auth")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    // Signed-in people have nothing to do here.
    const viewer = await context.queryClient.ensureQueryData(orpc.session.viewer.queryOptions());
    if (viewer) throw redirect({ href: search.redirectTo ?? DEFAULT_REDIRECT });
  },
  // Sign-in has nothing to find in search results. After `beforeLoad`, whose result `args` carries
  // (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.auth_title(), index: false }),
  component: AuthPage,
});

/*===== Page =====*/
function AuthPage() {
  const redirectTo = Route.useSearch({ select: (search) => search.redirectTo ?? DEFAULT_REDIRECT });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The cached viewer still says "signed out": refetch it first, so the header updates and the next page's guard sees
  // the session.
  const goOn = async () => {
    await queryClient.invalidateQueries({ queryKey: orpc.session.viewer.key() });
    await navigate({ href: redirectTo, replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-h2">{m.auth_heading()}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm onSuccess={() => void goOn()} />
          {/* There is no sign-up: an admin makes every account. */}
          <p className="mt-6 text-caption text-muted-foreground">{m.auth_no_account()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
