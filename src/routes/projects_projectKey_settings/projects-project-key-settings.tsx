import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";
import { ColumnForm } from "#/routes/projects_projectKey_settings/components/column-form";
import { MembersForm } from "#/routes/projects_projectKey_settings/components/members-form";
import { ProjectNameForm } from "#/routes/projects_projectKey_settings/components/project-name-form";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/_admin-layout/projects/$projectKey/settings")({
  loader: async ({ context, params }) => {
    const [project] = await Promise.all([
      ensureProject({ queryClient: context.queryClient, projectKey: params.projectKey }),
      context.queryClient.ensureQueryData(orpc.team.list.queryOptions()),
    ]);
    return project;
  },
  head: (args) => pageMeta({ args, title: m.settings_title({ project: args.loaderData?.name ?? "" }), index: false }),
  component: SettingsPage,
});

/*===== Page =====*/

/** A project's settings, admin only: its name, its members, and its columns' names and WIP limits. */
function SettingsPage() {
  const { projectKey } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));

  return (
    <div className="mx-auto flex max-w-site flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2">
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: project.key }}
          className="flex w-fit items-center gap-1.5 rounded-chassis text-caption text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {/* "Back" points against the reading direction. */}
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {m.settings_back_to_board()}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-h2">{m.settings_heading({ project: project.name })}</h1>
          <Marking variant="code">{project.key}</Marking>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{m.settings_general()}</h2>
          </CardTitle>
          <CardDescription>{m.settings_general_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectNameForm project={project} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{m.settings_members()}</h2>
          </CardTitle>
          <CardDescription>{m.settings_members_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersForm project={project} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{m.settings_columns()}</h2>
          </CardTitle>
          <CardDescription>{m.settings_columns_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {project.columns.map((column) => (
              <ColumnForm key={column.id} projectId={project.id} column={column} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
