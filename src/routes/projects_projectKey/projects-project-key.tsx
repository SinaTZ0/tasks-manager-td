import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { columnTitle } from "#/lib/column-title";
import { pageMeta } from "#/lib/seo";
import { m } from "#/paraglide/messages";
import { BoardColumn } from "#/routes/projects_projectKey/components/board-column";
import { ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey")({
  // Returns the project as well as caching it: `head` needs its name.
  loader: ({ context, params }) => ensureProject({ queryClient: context.queryClient, projectKey: params.projectKey }),
  head: (args) => pageMeta({ args, title: args.loaderData?.name ?? m.projects_title(), index: false }),
  component: BoardPage,
});

/*===== Board =====*/

/**
 * A project's board: every column but the cancelled one in one housing, side by side, wider than the window, so the
 * row scrolls.
 */
function BoardPage() {
  const { projectKey } = Route.useParams();
  const { viewer } = Route.useRouteContext();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const columns = project.columns.filter((column) => column.kind !== "cancelled");

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <div className="flex items-center gap-4">
        <h1 className="font-heading text-h2">{project.name}</h1>
        <Marking variant="code">
          <bdi dir="ltr">{project.key}</bdi>
        </Marking>
        <AvatarGroup className="ms-auto">
          {project.members.map((member) => (
            <PersonAvatar key={member.id} name={member.name} />
          ))}
        </AvatarGroup>
        {viewer.role === "admin" && (
          <Link
            to="/projects/$projectKey/settings"
            params={{ projectKey: project.key }}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <SettingsIcon data-icon="inline-start" />
            {m.project_settings()}
          </Link>
        )}
      </div>

      {/*------ Columns ------*/}
      <Card>
        <CardContent>
          {/* Browsers make a scrolling box keyboard-focusable themselves, so it gets the focus ring but no `tabIndex`. */}
          <section
            aria-label={m.board_columns()}
            className="-m-2 flex gap-6 overflow-x-auto p-2 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {columns.map((column) => (
              <BoardColumn key={column.id} title={columnTitle(column)} count={0} wipLimit={column.wipLimit} />
            ))}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
