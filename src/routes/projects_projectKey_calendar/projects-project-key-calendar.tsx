import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon, KanbanIcon } from "lucide-react";
import { useMemo } from "react";

import { Button } from "#/components/primitive/button/button";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Marking } from "#/components/primitive/marking/marking";
import { formatDate, isoToDate } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { teamToday } from "#/lib/team-day";
import { cn } from "#/lib/utils";
import type { Person } from "#/orpc/project/contract";
import type { TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { cardFilter, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { BoardFilters } from "#/routes/projects_projectKey/components/board-filters";
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
  const { viewerId, canEdit } = useBoardAccess();
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
  const people = useMemo(
    () => new Map<string, Person>([...board.people, ...project.members].map((person) => [person.id, person])),
    [board.people, project.members],
  );
  const kindOf = useMemo(() => new Map(project.columns.map((column) => [column.id, column.kind])), [project.columns]);

  /*------ Filters ------*/
  const { assignee, label, priority, due, blocked } = search;
  const shown = useMemo(() => {
    const current: BoardFilter = { assignee, label, priority, due, blocked };
    const live = board.tasks.filter((task) => kindOf.get(task.columnId) !== "cancelled");
    if (!isFiltering(current)) return live;
    const tasks = new Map(board.tasks.map((task) => [task.id, task]));
    const kinds = kindsOf(project);
    const keep = cardFilter({
      filter: current,
      viewerId,
      today,
      isBlocked: (task) => blockersOf({ task, tasks, kinds }).length > 0,
    });
    return live.filter(keep);
  }, [assignee, label, priority, due, blocked, board.tasks, kindOf, project, viewerId, today]);
  const undated = shown.filter((task) => task.dueDate === null).length;
  const setFilter = (patch: Partial<BoardFilter>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const assignable = project.members.filter((member) => member.role !== "viewer");
  const isFinished = (task: TaskCard) => kindOf.get(task.columnId) === "done";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <div className="flex items-center gap-4">
        <h1 className="font-heading text-h2">{m.calendar_heading({ project: project.name })}</h1>
        <Marking variant="code">{project.key}</Marking>
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: project.key }}
          search={{ assignee, label, priority, due, blocked }}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "ms-auto")}
        >
          <KanbanIcon data-icon="inline-start" />
          {m.board_link()}
        </Link>
      </div>

      {/*------ Filters ------*/}
      <BoardFilters
        filter={{ assignee, label, priority, due, blocked }}
        people={assignable}
        labels={board.labels}
        onChange={setFilter}
      />

      {/*------ Month ------*/}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={m.calendar_previous()}
          onClick={() => showMonth(month.previous)}
        >
          <ChevronRightIcon className="ltr:-scale-x-100" />
        </Button>
        <h2 className="min-w-44 text-center font-heading text-h4" aria-live="polite">
          {formatDate(isoToDate(month.first), { month: "long", year: "numeric" })}
        </h2>
        <Button variant="secondary" size="icon-sm" aria-label={m.calendar_next()} onClick={() => showMonth(month.next)}>
          <ChevronLeftIcon className="ltr:-scale-x-100" />
        </Button>
        {month.first !== thisMonth && (
          <Button variant="ghost" size="sm" onClick={() => showMonth(undefined)}>
            {m.calendar_this_month()}
          </Button>
        )}
        {undated > 0 && (
          <Link
            to="/projects/$projectKey"
            params={{ projectKey: project.key }}
            search={{ assignee, label, priority, blocked, due: "none" }}
            className="ms-auto text-body-sm font-semibold underline-offset-4 hover:underline"
          >
            {m.calendar_no_due({ count: undated })}
          </Link>
        )}
      </div>

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

      {search.task && (
        <TaskDrawer
          key={search.task}
          code={search.task}
          project={project}
          board={board}
          people={people}
          onClose={() => void navigate({ search: (previous) => ({ ...previous, task: undefined }) })}
        />
      )}
    </div>
  );
}
