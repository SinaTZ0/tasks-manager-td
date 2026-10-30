import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { PageHead } from "#/components/shared/page-head/page-head";
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
    <div className="mx-auto flex max-w-site flex-col gap-6 px-6 py-8">
      <PageHead title={m.team_title()} description={m.team_description()} />

      <div className="flex items-start gap-6">
        {/*===== Teammates =====*/}
        <Card className="min-w-0 flex-1">
          <CardContent>
            <ul className="striped">
              {team.map((member) => (
                <MemberRow key={member.id} member={member} isSelf={member.id === viewer.id} />
              ))}
            </ul>
          </CardContent>
        </Card>

        {/*===== New Teammate =====*/}
        <Card className="w-88 shrink-0">
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
    </div>
  );
}
