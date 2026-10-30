import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FolderKanbanIcon } from "lucide-react";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { ProjectSummary } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { NewProjectDialog } from "#/routes/home/components/new-project-dialog";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/")({
  loader: async ({ context }) => {
    const isAdmin = context.viewer.role === "admin";
    const [projects] = await Promise.all([
      context.queryClient.ensureQueryData(orpc.project.list.queryOptions()),
      // The new-project form picks members from the whole team.
      isAdmin ? context.queryClient.ensureQueryData(orpc.team.list.queryOptions()) : null,
    ]);

    // Someone on a single project has nothing to choose here, so the board opens straight away. Admins always see the
    // list, since it is where they make new projects.
    const [only] = projects;
    if (!isAdmin && only && projects.length === 1) {
      throw redirect({ to: "/projects/$projectKey", params: { projectKey: only.key }, replace: true });
    }
  },
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.projects_title(), index: false }),
  component: ProjectsPage,
});

/*===== Page =====*/

/** The projects the viewer can open, one housing module each. Admins also make new projects here. */
function ProjectsPage() {
  const { viewer } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(orpc.project.list.queryOptions());
  const isAdmin = viewer.role === "admin";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-h2">{m.projects_title()}</h1>
        {isAdmin && <NewProjectDialog viewerId={viewer.id} />}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <FolderKanbanIcon className="size-8" />
              <p>{isAdmin ? m.projects_empty_admin() : m.projects_empty_member()}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <li key={project.id} className="flex">
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/*===== Project Card =====*/

/** A whole-card link to the project's board: its name, its key as a printed code, and its members' caps. */
function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card className="flex-1" render={<Link to="/projects/$projectKey" params={{ projectKey: project.key }} />}>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3">{project.name}</h2>
            <Marking variant="code">{project.key}</Marking>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project.members.length === 0 ? (
          <Marking>{m.projects_no_members()}</Marking>
        ) : (
          <AvatarGroup>
            {project.members.map((member) => (
              <PersonAvatar key={member.id} name={member.name} />
            ))}
          </AvatarGroup>
        )}
      </CardContent>
    </Card>
  );
}
