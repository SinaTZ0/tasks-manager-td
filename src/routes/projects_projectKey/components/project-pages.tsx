import { Link } from "@tanstack/react-router";

import { slotKeyClasses } from "#/components/primitive/button/button.styles";
import { slotClasses } from "#/components/primitive/instrument.styles";
import { Led } from "#/components/primitive/led/led";
import { cn } from "#/lib/utils";
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
 * carry the filters across. `layout` sets how the keys lie: a row in a page head, or two abreast on the board's side
 * rail, where a last key left alone takes the whole width instead of leaving a hole beside it.
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
  layout?: "row" | "grid";
}) {
  const params = { projectKey };
  const grid = layout === "grid";
  const keyClasses = cn(slotKeyClasses, grid && "w-full justify-start");

  return (
    <nav aria-label={m.board_project_pages()}>
      <ul className={cn(slotClasses, grid && "grid w-full grid-cols-2")}>
        <li className="flex">
          <Link
            to="/projects/$projectKey"
            params={params}
            search={filter}
            activeOptions={ACTIVE}
            className={keyClasses}
          >
            {({ isActive }) => <PageKey active={isActive} label={m.board_link()} />}
          </Link>
        </li>
        <li className="flex">
          <Link
            to="/projects/$projectKey/calendar"
            params={params}
            search={filter}
            activeOptions={ACTIVE}
            className={keyClasses}
          >
            {({ isActive }) => <PageKey active={isActive} label={m.calendar_link()} />}
          </Link>
        </li>
        <li className="flex">
          <Link to="/projects/$projectKey/activity" params={params} activeOptions={ACTIVE} className={keyClasses}>
            {({ isActive }) => <PageKey active={isActive} label={m.activity_link()} />}
          </Link>
        </li>
        <li className="flex">
          <Link to="/projects/$projectKey/archive" params={params} activeOptions={ACTIVE} className={keyClasses}>
            {({ isActive }) => <PageKey active={isActive} label={m.archive_link()} />}
          </Link>
        </li>
        {isAdmin && (
          <li className={cn("flex", grid && "col-span-2")}>
            <Link to="/projects/$projectKey/settings" params={params} activeOptions={ACTIVE} className={keyClasses}>
              {({ isActive }) => <PageKey active={isActive} label={m.project_settings()} />}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

function PageKey({ active, label }: { active: boolean; label: string }) {
  return (
    <>
      <Led signal="selection" state={active ? "on" : "off"} size="sm" />
      {label}
    </>
  );
}
