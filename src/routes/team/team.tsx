import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { MemberRow } from "#/routes/team/components/member-row";
import { NewMemberForm } from "#/routes/team/components/new-member-form";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/_admin-layout/team")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.team.list.queryOptions()),
  head: (args) => pageMeta({ args, title: m.team_title(), index: false }),
  component: TeamPage,
});

/*===== Page =====*/

/** The admin's team page: every account with its role and status, and the form that makes a new one. */
function TeamPage() {
  const { viewer } = Route.useRouteContext();
  const { data: team } = useSuspenseQuery(orpc.team.list.queryOptions());

  return (
    <div className="mx-auto flex max-w-site gap-6 px-6 py-8">
      {/*===== Teammates =====*/}
      <Card className="min-w-0 flex-1 self-start">
        <CardHeader>
          <CardTitle>
            <h1 className="text-h3">{m.team_title()}</h1>
          </CardTitle>
          <CardDescription>{m.team_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="striped">
            {team.map((member) => (
              <MemberRow key={member.id} member={member} isSelf={member.id === viewer.id} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {/*===== New Teammate =====*/}
      <Card className="w-88 shrink-0 self-start">
        <CardHeader>
          <CardTitle>
            <h2 className="text-h3">{m.team_new_heading()}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewMemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
