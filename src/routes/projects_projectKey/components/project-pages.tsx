import { Link } from "@tanstack/react-router";
import { ArchiveIcon, CalendarDaysIcon, HistoryIcon, SettingsIcon, SquareKanbanIcon } from "lucide-react";

import { Led } from "#/components/primitive/led/led";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "#/components/primitive/sidebar/sidebar";
import { m } from "#/paraglide/messages";
import type { BoardFilter } from "#/routes/projects_projectKey/board-filter";

/*===== Project Pages =====*/

// A key lights on its own page only: `exact`, since the board's path starts every other project page's, and not by
// search, since the filters a key carries and the ones in the address can differ.
const ACTIVE = { exact: true, includeSearch: false };

/**
 * The selector of a project's pages, the header's navigation one level down: the board, calendar, activity, archive and
 * (for an admin) settings, every one on every page and always in that order, so a key can be found by where it sits.
 * The current page's key stays sunk with its LED lit. The board and the calendar show the same cards, so their keys
 * carry the filters across. A menu down the project's sidebar, where each key has an icon, so it still reads once the
 * sidebar shrinks to a strip (its name then shows on hover).
 */
export function ProjectPages({
  projectKey,
  isAdmin,
  filter = {},
}: {
  projectKey: string;
  isAdmin: boolean;
  filter?: BoardFilter;
}) {
  const { setOpenMobile } = useSidebar();
  const params = { projectKey };
  // The header's search filters the board only, so the calendar takes the filter keys without its text.
  const { q: _q, ...keys } = filter;
  const pages = [
    { to: "/projects/$projectKey", search: filter, label: m.board_link(), Icon: SquareKanbanIcon },
    { to: "/projects/$projectKey/calendar", search: keys, label: m.calendar_link(), Icon: CalendarDaysIcon },
    { to: "/projects/$projectKey/activity", label: m.activity_link(), Icon: HistoryIcon },
    { to: "/projects/$projectKey/archive", label: m.archive_link(), Icon: ArchiveIcon },
    ...(isAdmin ? [{ to: "/projects/$projectKey/settings", label: m.project_settings(), Icon: SettingsIcon }] : []),
  ] as const;

  return (
    <nav aria-label={m.board_project_pages()}>
      <SidebarMenu>
        {pages.map(({ to, label, Icon, ...page }) => (
          <SidebarMenuItem key={to}>
            <SidebarMenuButton
              size="sm"
              tooltip={label}
              render={
                // A phone's sheet covers the page, so going to one has to close it. Filters leave it open: they're picked in a row.
                <Link to={to} params={params} activeOptions={ACTIVE} onClick={() => setOpenMobile(false)} {...page}>
                  {({ isActive }) => (
                    <>
                      <Led
                        signal="selection"
                        state={isActive ? "on" : "off"}
                        size="sm"
                        className="absolute inset-e-3 sidebar-icon:inset-e-1 sidebar-icon:top-1"
                      />
                      <Icon />
                      <span>{label}</span>
                    </>
                  )}
                </Link>
              }
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  );
}
