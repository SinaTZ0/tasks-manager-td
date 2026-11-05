import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Display } from "#/components/primitive/display/display";
import { PageHead } from "#/components/shared/page-head/page-head";
import { formatDate, isoToDate } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { teamToday } from "#/lib/team-day";
import type { Person } from "#/orpc/project/contract";
import type { TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { cardFilter, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { BoardFilters } from "#/routes/projects_projectKey/components/board-filters";
import { PanelGroup } from "#/routes/projects_projectKey/components/panel-group";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
import { TaskDrawer } from "#/routes/projects_projectKey/components/task-drawer";
import { blockersOf, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { boardQuery, ensureProject, projectQuery, taskQuery } from "#/routes/projects_projectKey/queries";
import { taskNumberOf } from "#/routes/projects_projectKey/search-params";
import { MonthGrid } from "#/routes/projects_projectKey_calendar/components/month-grid";
import { monthOf, monthStart } from "#/routes/projects_projectKey_calendar/month";
import { calendarSearchSchema } from "#/routes/projects_projectKey_calendar/search-params";

/*===== Route =====*/
/** A link to a task that isn't there leaves the drawer to say so; any other failure is the page's. */
const ignoreMissing = (error: unknown) => {
  if (!(error instanceof ORPCError && error.code === "NOT_FOUND")) throw error;
};

export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey/calendar")({
  validateSearch: calendarSearchSchema,
  loaderDeps: ({ search }) => ({ task: search.task }),
  loader: async ({ context, params, deps }) => {
    const { queryClient } = context;
    const project = await ensureProject({ queryClient, projectKey: params.projectKey });
    await Promise.all([
      queryClient.ensureQueryData(boardQuery(project.id)),
      deps.task
        ? queryClient
            .ensureQueryData(taskQuery({ projectId: project.id, number: taskNumberOf(deps.task) }))
            .catch(ignoreMissing)
        : null,
    ]);
    // Returned as well as cached: `head` needs the name.
    return project;
  },
  head: (args) => pageMeta({ args, title: m.calendar_heading({ project: args.loaderData?.name ?? "" }), index: false }),
  component: CalendarPage,
});

/*===== Page =====*/

/**
 * A project's cards on a month calendar, by due date (docs/task-manager-plan.md → slice 21), with the board's filters.
 * Stopped cards are left out, as on the board; done ones show without a warning. Cards with no due date are counted,
 * linking to the board filtered to them. A card opens its drawer over the calendar.
 */
function CalendarPage() {
  const { projectKey } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { viewerId, canEdit, isAdmin } = useBoardAccess();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data: board } = useSuspenseQuery(boardQuery(project.id));

  /*------ Month ------*/
  const locale = getLocale();
  const today = teamToday();
  const month = monthOf({ first: monthStart({ date: search.month ?? today, locale }), locale });
  const thisMonth = monthStart({ date: today, locale });
  const showMonth = (date: string | undefined) =>
    void navigate({ search: (previous) => ({ ...previous, month: date }), replace: true });

  /*------ Lookups ------*/
  const people = new Map<string, Person>([...board.people, ...project.members].map((person) => [person.id, person]));
  const kindOf = new Map(project.columns.map((column) => [column.id, column.kind]));

  /*------ Filters ------*/
  const { assignee, label, priority, due, blocked } = search;
  const current: BoardFilter = { assignee, label, priority, due, blocked };
  const live = board.tasks.filter((task) => kindOf.get(task.columnId) !== "cancelled");
  const tasks = new Map(board.tasks.map((task) => [task.id, task]));
  const kinds = kindsOf(project);
  const shown = isFiltering(current)
    ? live.filter(
        cardFilter({
          filter: current,
          projectKey: project.key,
          viewerId,
          today,
          isBlocked: (task) => blockersOf({ task, tasks, kinds }).length > 0,
        }),
      )
    : live;
  const undated = shown.filter((task) => task.dueDate === null).length;
  const setFilter = (patch: Partial<BoardFilter>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const assignable = project.members.filter((member) => member.role !== "viewer");
  const isFinished = (task: TaskCard) => kindOf.get(task.columnId) === "done";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <PageHead
        code={project.key}
        kicker={project.name}
        title={m.calendar_link()}
        actions={
          <ProjectPages
            projectKey={project.key}
            isAdmin={isAdmin}
            filter={{ assignee, label, priority, due, blocked }}
          />
        }
      />

      {/*------ Month and Filters ------*/}
      {/* One panel, like the board's: the month in a display window between the keys that step it, then the same
          filter keys as the board. */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <PanelGroup label={m.calendar_panel_month()}>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={m.calendar_previous()}
                onClick={() => showMonth(month.previous)}
              >
                <ChevronRightIcon className="ltr:-scale-x-100" />
              </Button>
              <Display size="row" className="min-w-40">
                <h2 className="font-heading text-h4" aria-live="polite">
                  {formatDate(isoToDate(month.first), { month: "long", year: "numeric" })}
                </h2>
              </Display>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={m.calendar_next()}
                onClick={() => showMonth(month.next)}
              >
                <ChevronLeftIcon className="ltr:-scale-x-100" />
              </Button>
              {month.first !== thisMonth && (
                <Button variant="ghost" size="sm" onClick={() => showMonth(undefined)}>
                  {m.calendar_this_month()}
                </Button>
              )}
            </PanelGroup>
            <PanelGroup label={m.board_panel_filter()}>
              <BoardFilters
                filter={{ assignee, label, priority, due, blocked }}
                people={assignable}
                labels={board.labels}
                onChange={setFilter}
              />
            </PanelGroup>
            {undated > 0 && (
              <Link
                to="/projects/$projectKey"
                params={{ projectKey: project.key }}
                search={{ assignee, label, priority, blocked, due: "none" }}
                className="ms-auto self-end py-2 text-body-sm font-semibold underline-offset-4 hover:underline"
              >
                {m.calendar_no_due({ count: undated })}
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <MonthGrid
        month={month}
        today={today}
        tasks={shown}
        projectId={project.id}
        projectKey={project.key}
        isFinished={isFinished}
        canEdit={canEdit}
        onMonthChange={showMonth}
      />

      <TaskDrawer
        code={search.task}
        project={project}
        board={board}
        people={people}
        onClose={() => void navigate({ search: (previous) => ({ ...previous, task: undefined }) })}
      />
    </div>
  );
}
