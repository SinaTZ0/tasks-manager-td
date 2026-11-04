import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { PageHead } from "#/components/shared/page-head/page-head";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
import { boardQuery, ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";
import { AddColumnForm } from "#/routes/projects_projectKey_settings/components/add-column-form";
import { ColumnStrips } from "#/routes/projects_projectKey_settings/components/column-strips";
import { MembersForm } from "#/routes/projects_projectKey_settings/components/members-form";
import { ProjectNameForm } from "#/routes/projects_projectKey_settings/components/project-name-form";

/*===== Route =====*/

export const Route = createFileRoute("/_site-layout/_app-layout/_admin-layout/projects/$projectKey/settings")({
  loader: async ({ context, params }) => {
    const [project] = await Promise.all([
      ensureProject({ queryClient: context.queryClient, projectKey: params.projectKey }),
      context.queryClient.ensureQueryData(orpc.team.list.queryOptions()),
    ]);
    // The column strips count the cards on the board: only an empty column can be removed.
    await context.queryClient.ensureQueryData(boardQuery(project.id));
    return project;
  },
  head: (args) => pageMeta({ args, title: m.settings_title({ project: args.loaderData?.name ?? "" }), index: false }),
  component: SettingsPage,
});

/*===== Page =====*/

/**
 * A project's settings, admin only: its name, its members, and its columns: their names and WIP limits, adding custom
 * ones and removing empty ones.
 */
function SettingsPage() {
  const { projectKey } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data: board } = useSuspenseQuery(boardQuery(project.id));
  const cardCount = (columnId: string) => board.tasks.filter((task) => task.columnId === columnId).length;

  return (
    <div className="mx-auto flex max-w-site flex-col gap-6 px-6 py-8">
      <PageHead
        code={project.key}
        kicker={project.name}
        title={m.project_settings()}
        actions={<ProjectPages projectKey={project.key} isAdmin />}
      />

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
          <ColumnStrips project={project} cardCount={cardCount} />
          <div className="mt-6 border-t border-border pt-6">
            <AddColumnForm projectId={project.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
