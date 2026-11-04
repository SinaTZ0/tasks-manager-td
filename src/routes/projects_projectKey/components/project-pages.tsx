import { Link } from "@tanstack/react-router";
import { ArchiveIcon, CalendarDaysIcon, HistoryIcon, KanbanIcon, SettingsIcon } from "lucide-react";

import { buttonVariants } from "#/components/primitive/button/button.styles";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";
import type { BoardFilter } from "#/routes/projects_projectKey/board-filter";

/*===== Project Pages =====*/

export type ProjectPage = "board" | "calendar" | "activity" | "archive" | "settings";

const keyClasses = buttonVariants({ variant: "secondary", size: "sm" });

/**
 * Keys to a project's other pages, the same set on each of them: the board, calendar, activity, archive and (for an
 * admin) settings, leaving out the page they sit on. The board and the calendar show the same cards, so their keys
 * carry the filters across. `layout` sets how the keys lie: a row in a page head, a block of two by two on the board's
 * side rail.
 */
export function ProjectPages({
  projectKey,
  current,
  isAdmin,
  filter = {},
  layout = "row",
}: {
  projectKey: string;
  current: ProjectPage;
  isAdmin: boolean;
  filter?: BoardFilter;
  layout?: "row" | "grid";
}) {
  const params = { projectKey };
  return (
    <nav
      aria-label={m.board_project_pages()}
      className={cn(layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2")}
    >
      {current !== "board" && (
        // A link marks itself current on any path under its own (`aria-current`, which latches a key); the board's
        // path is the start of every other project page's.
        <Link
          to="/projects/$projectKey"
          params={params}
          search={filter}
          activeOptions={{ exact: true }}
          className={keyClasses}
        >
          <KanbanIcon data-icon="inline-start" />
          {m.board_link()}
        </Link>
      )}
      {current !== "calendar" && (
        <Link to="/projects/$projectKey/calendar" params={params} search={filter} className={keyClasses}>
          <CalendarDaysIcon data-icon="inline-start" />
          {m.calendar_link()}
        </Link>
      )}
      {current !== "activity" && (
        <Link to="/projects/$projectKey/activity" params={params} className={keyClasses}>
          <HistoryIcon data-icon="inline-start" />
          {m.activity_link()}
        </Link>
      )}
      {current !== "archive" && (
        <Link to="/projects/$projectKey/archive" params={params} className={keyClasses}>
          <ArchiveIcon data-icon="inline-start" />
          {m.archive_link()}
        </Link>
      )}
      {isAdmin && current !== "settings" && (
        <Link to="/projects/$projectKey/settings" params={params} className={keyClasses}>
          <SettingsIcon data-icon="inline-start" />
          {m.project_settings()}
        </Link>
      )}
    </nav>
  );
}
