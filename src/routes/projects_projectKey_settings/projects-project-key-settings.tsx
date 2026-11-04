import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Marking } from "#/components/primitive/marking/marking";
import { PageHead } from "#/components/shared/page-head/page-head";
import { pageMeta } from "#/lib/seo";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
import { boardQuery, ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";
import { AddColumnForm } from "#/routes/projects_projectKey_settings/components/add-column-form";
import { ColumnForm } from "#/routes/projects_projectKey_settings/components/column-form";
import { MembersForm } from "#/routes/projects_projectKey_settings/components/members-form";
import { ProjectNameForm } from "#/routes/projects_projectKey_settings/components/project-name-form";

/*===== Route =====*/

/** The ids of the column list's headings, which name every row's fields. */
const COLUMN_HEADINGS = { name: "column-heading-name", wip: "column-heading-wip" };
export const Route = createFileRoute("/_site-layout/_app-layout/_admin-layout/projects/$projectKey/settings")({
  loader: async ({ context, params }) => {
    const [project] = await Promise.all([
      ensureProject({ queryClient: context.queryClient, projectKey: params.projectKey }),
      context.queryClient.ensureQueryData(orpc.team.list.queryOptions()),
    ]);
    // The column rows count the cards on the board: only an empty column can be removed.
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
          <div className="flex flex-col gap-3">
            {/* Printed once over the rows; each row's fields are named by these and the row's kind. */}
            <div className="flex items-end gap-4">
              <span className="w-32 shrink-0" />
              <Marking id={COLUMN_HEADINGS.name} className="flex-1">
                {m.settings_column_name_label()}
              </Marking>
              <Marking id={COLUMN_HEADINGS.wip} className="w-32 shrink-0">
                {m.settings_column_wip_label()}
              </Marking>
              {/* Keeps the headings over their fields: the row's save and remove keys sit here. */}
              <span className={cn(buttonVariants({ variant: "secondary" }), "invisible")} aria-hidden="true">
                {m.settings_save()}
              </span>
              <span className="size-11 shrink-0" aria-hidden="true" />
            </div>
            {project.columns.map((column) => (
              <ColumnForm
                key={column.id}
                projectId={project.id}
                column={column}
                cardCount={cardCount(column.id)}
                headings={COLUMN_HEADINGS}
              />
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-6">
            <AddColumnForm projectId={project.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
