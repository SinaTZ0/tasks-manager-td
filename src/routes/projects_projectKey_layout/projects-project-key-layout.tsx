import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatch, useSearch } from "@tanstack/react-router";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { Marking } from "#/components/primitive/marking/marking";
import {
  Sidebar,
  SidebarExpanded,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
} from "#/components/primitive/sidebar/sidebar";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import {
  BOARD_PANEL_ID,
  BoardPanelProvider,
  BoardPanelToggle,
} from "#/routes/projects_projectKey/components/board-panel";
import { BoardSidebar } from "#/routes/projects_projectKey/components/board-sidebar";
import { NewTaskDialog } from "#/routes/projects_projectKey/components/new-task-dialog";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
import { ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Route =====*/

const BOARD_ROUTE_ID = "/_site-layout/_app-layout/projects/$projectKey/";

export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey")({
  loader: ({ context, params }) => ensureProject({ queryClient: context.queryClient, projectKey: params.projectKey }),
  component: ProjectLayout,
});

/*===== Layout =====*/

/**
 * Every page of a project stands beside its sidebar, which stays in place from page to page: the project's name and
 * people, the new-task key and the selector of its pages. The board adds its display and keys below them.
 */
function ProjectLayout() {
  const { projectKey } = Route.useParams();
  const { isAdmin } = useBoardAccess();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const board = useMatch({ from: BOARD_ROUTE_ID, shouldThrow: false });

  // The board's and the calendar's filters, which the keys of those two pages carry across.
  const { q, assignee, label, priority, due, blocked, hide } = useSearch({ strict: false });
  const hidden = new Set(hide);
  const columns = project.columns.filter((column) => column.kind !== "cancelled");

  // The board has no head of its own, so the project's name is its heading; every other page's head has one.
  const Name = board ? "h1" : "p";

  return (
    <BoardPanelProvider>
      {/*===== Sidebar =====*/}
      {/* The project's front panel, standing beside the page so it gets the window's whole height. Its key shrinks it
          to a strip of icons (src/lib/board-panel.ts): the key itself, the project's key, the new-task key and its
          pages. What stays in the strip sits above the part that scrolls, so a scrolled sidebar can't shrink with it
          out of view. `dark`: the sidebar is display glass in both themes, so what sits on it uses the graphite
          edition's tokens. */}
      <Sidebar id={BOARD_PANEL_ID} collapsible="icon" aria-label={project.name}>
        <SidebarHeader>
          {/*------ Name ------*/}
          {/* The key stands in the top corner, beside the name, so it rides the sidebar's edge and never jumps. In the
              strip the name is gone and the project's key moves down below it. */}
          <div className="relative flex flex-col transition-all duration-240 ease-in-out sidebar-icon:pt-10">
            <BoardPanelToggle className="absolute inset-e-1 top-0.5" />
            <SidebarExpanded>
              <Name className="truncate pe-10 font-heading text-h1">{project.name}</Name>
            </SidebarExpanded>
            <span className="flex items-center gap-3 sidebar-icon:justify-center">
              <Marking variant="code">{project.key}</Marking>
              <AvatarGroup className="sidebar-icon:hidden">
                {project.members.map((member) => (
                  <PersonAvatar key={member.id} name={member.name} src={member.avatarUrl} />
                ))}
              </AvatarGroup>
            </span>
          </div>

          {isAdmin && (
            <SidebarMenu>
              <SidebarMenuItem>
                <NewTaskDialog
                  projectId={project.id}
                  projectKey={project.key}
                  columns={columns}
                  defaultColumnId={columns.find((column) => !hidden.has(column.id))?.id}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          {/*------ Pages ------*/}
          <ProjectPages
            projectKey={project.key}
            isAdmin={isAdmin}
            filter={{ q, assignee, label, priority, due, blocked }}
          />
        </SidebarHeader>

        {board && <BoardSidebar project={project} search={board.search} />}
      </Sidebar>

      {/*------ Page ------*/}
      {/* A `div`: the site layout's `main` already holds the page. */}
      <SidebarInset render={<div />}>
        {/* On a phone the sidebar is a closed sheet, and the key inside it can't open it. */}
        <BoardPanelToggle className="ms-6 mt-6 self-start md:hidden" />
        <Outlet />
      </SidebarInset>
    </BoardPanelProvider>
  );
}
