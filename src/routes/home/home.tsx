import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FolderKanbanIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { Display, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { PageHead } from "#/components/shared/page-head/page-head";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { columnKindTitle } from "#/lib/column-title";
import { formatNumber } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { ProjectListItem } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { NewProjectDialog } from "#/routes/home/components/new-project-dialog";

/*===== Route =====*/

// The cards show each board's live counts, which others change all day: they go stale after half a minute rather than
// the usual five, so coming back here refetches them.
const projectsQuery = () => orpc.project.list.queryOptions({ staleTime: 30_000 });

export const Route = createFileRoute("/_site-layout/_app-layout/")({
  loader: async ({ context }) => {
    const isAdmin = context.viewer.role === "admin";
    const [projects] = await Promise.all([
      context.queryClient.ensureQueryData(projectsQuery()),
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
  const { data: projects } = useSuspenseQuery(projectsQuery());
  const isAdmin = viewer.role === "admin";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHead title={m.projects_title()} actions={isAdmin && <NewProjectDialog viewerId={viewer.id} />} />

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

/**
 * A whole-card link to the project's board, as a small module: its name and key, a display of what its board holds
 * right now (open tasks, those in progress, tasks late; an LED lights beside the last two when they aren't zero), and
 * its members' caps.
 */
function ProjectCard({ project }: { project: ProjectListItem }) {
  const { open, doing, late } = project.readings;
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
        <div className="flex flex-col gap-4">
          <Display size="sm">
            <dl className="grid grid-cols-3 gap-3">
              <Reading label={m.projects_reading_open()} value={open} />
              <Reading
                label={columnKindTitle("doing")}
                value={doing}
                led={<Led signal="positive" state={doing > 0 ? "blink" : "off"} size="sm" />}
              />
              <Reading
                label={m.board_stat_late()}
                value={late}
                led={<Led signal="action" state={late > 0 ? "on" : "off"} size="sm" />}
              />
            </dl>
          </Display>
          {project.members.length === 0 ? (
            <Marking>{m.projects_no_members()}</Marking>
          ) : (
            <AvatarGroup>
              {project.members.map((member) => (
                <PersonAvatar key={member.id} name={member.name} src={member.avatarUrl} />
              ))}
            </AvatarGroup>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** One count on a project's display: its name over the value, with an LED beside the name when it can need someone. */
function Reading({ label, value, led }: { label: string; value: number; led?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="flex items-center gap-1.5">
        {led}
        <DisplayLabel>{label}</DisplayLabel>
      </dt>
      <dd>
        <DisplayValue>{formatNumber(value)}</DisplayValue>
      </dd>
    </div>
  );
}
