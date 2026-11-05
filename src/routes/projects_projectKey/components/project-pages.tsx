import { Link } from "@tanstack/react-router";
import { ArchiveIcon, CalendarDaysIcon, HistoryIcon, SettingsIcon, SquareKanbanIcon } from "lucide-react";

import { slotKeyClasses } from "#/components/primitive/button/button.styles";
import { slotClasses } from "#/components/primitive/instrument.styles";
import { Led } from "#/components/primitive/led/led";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "#/components/primitive/sidebar/sidebar";
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
 * carry the filters across. `layout` sets how the keys lie: a row in a page head, or a menu down the board's sidebar,
 * where each key has an icon, so it still reads once the sidebar shrinks to a strip (its name then shows on hover).
 */
export function ProjectPages({
  projectKey,
  isAdmin,
  filter = {},
  layout = "row",
}: {
  projectKey: string;
  isAdmin: boolean;
  filter?: BoardFilter;
  layout?: "row" | "sidebar";
}) {
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
      {layout === "sidebar" ? (
        <SidebarMenu>
          {pages.map(({ to, label, Icon, ...page }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                size="sm"
                tooltip={label}
                render={
                  <Link to={to} params={params} activeOptions={ACTIVE} {...page}>
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
      ) : (
        <ul className={slotClasses}>
          {pages.map(({ to, label, Icon: _Icon, ...page }) => (
            <li key={to} className="flex">
              <Link to={to} params={params} activeOptions={ACTIVE} className={slotKeyClasses} {...page}>
                {({ isActive }) => (
                  <>
                    <Led signal="selection" state={isActive ? "on" : "off"} size="sm" />
                    {label}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
