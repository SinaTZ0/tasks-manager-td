import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { SidebarContent, SidebarGroup } from "#/components/primitive/sidebar/sidebar";
import { Toggle } from "#/components/primitive/toggle/toggle";
import type { Project } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import type { BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { SHOW_CANCELLED_ID } from "#/routes/projects_projectKey/components/board";
import { BoardDisplay } from "#/routes/projects_projectKey/components/board-display";
import { BoardFilters } from "#/routes/projects_projectKey/components/board-filters";
import { BoardLayoutPicker } from "#/routes/projects_projectKey/components/board-layout-picker";
import { boardQuery } from "#/routes/projects_projectKey/queries";
import type { BoardSearch } from "#/routes/projects_projectKey/search-params";

/*===== Board Sidebar =====*/

/**
 * What the sidebar holds on the board only: its display and its keys. They fade away when the sidebar shrinks to its
 * strip; the filters still apply, and the columns say "3 of 9".
 */
export function BoardSidebar({ project, search }: { project: Project; search: BoardSearch }) {
  const navigate = useNavigate({ from: "/projects/$projectKey/" });
  const { data: board } = useSuspenseQuery(boardQuery(project.id));

  const { q, assignee, label, priority, due, blocked, cancelled = false } = search;
  const current: BoardFilter = { q, assignee, label, priority, due, blocked };
  const setFilter = (patch: Partial<BoardFilter>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  const hidden = new Set(search.hide);
  const setHidden = (ids: string[]) =>
    void navigate({ search: (previous) => ({ ...previous, hide: ids.length > 0 ? ids : undefined }), replace: true });

  // Anyone a card can be assigned to; viewers never are.
  const assignable = project.members.filter((member) => member.role !== "viewer");

  return (
    <SidebarContent folding>
      <SidebarGroup>
        <BoardDisplay project={project} board={board} hidden={hidden} onHiddenChange={setHidden} />
      </SidebarGroup>

      {/*------ Keys ------*/}
      <SidebarGroup>
        <BoardFilters filter={current} people={assignable} labels={board.labels} onChange={setFilter} layout="grid">
          <Toggle
            id={SHOW_CANCELLED_ID}
            size="md"
            signal="selection"
            aria-label={m.board_show_cancelled()}
            pressed={cancelled}
            onPressedChange={(pressed) =>
              void navigate({
                search: (previous) => ({ ...previous, cancelled: pressed || undefined }),
                replace: true,
                // The board brings the column into view; the router's jump to the top would undo that.
                resetScroll: false,
              })
            }
            className="w-full"
          >
            {m.board_mark_cancelled()}
          </Toggle>
        </BoardFilters>
      </SidebarGroup>
      <SidebarGroup>
        <BoardLayoutPicker />
      </SidebarGroup>
    </SidebarContent>
  );
}
