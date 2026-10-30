import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArchiveIcon, CalendarDaysIcon, HistoryIcon, SettingsIcon } from "lucide-react";
import { useMemo } from "react";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { Switch } from "#/components/primitive/switch/switch";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import { teamToday } from "#/lib/team-day";
import { cardFilter, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { BoardColumnToggles } from "#/routes/projects_projectKey/components/board-column-toggles";
import { BoardFilters } from "#/routes/projects_projectKey/components/board-filters";
import { BoardLayoutPicker } from "#/routes/projects_projectKey/components/board-layout-picker";
import { NewTaskDialog } from "#/routes/projects_projectKey/components/new-task-dialog";
import { Board, SHOW_CANCELLED_ID } from "#/routes/projects_projectKey/components/board";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { TaskDrawer } from "#/routes/projects_projectKey/components/task-drawer";
import { blockersOf, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { boardQuery, ensureProject, projectQuery, taskQuery, timeQuery } from "#/routes/projects_projectKey/queries";
import { boardSearchSchema, taskNumberOf } from "#/routes/projects_projectKey/search-params";

/*===== Route =====*/

/** A link to a task that isn't there leaves the drawer to say so; any other failure is the page's. */
const ignoreMissing = (error: unknown) => {
  if (!(error instanceof ORPCError && error.code === "NOT_FOUND")) throw error;
};

export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey")({
  validateSearch: boardSearchSchema,
  loaderDeps: ({ search }) => ({ task: search.task }),
  loader: async ({ context, params, deps }) => {
    const { queryClient } = context;
    const project = await ensureProject({ queryClient, projectKey: params.projectKey });
    await Promise.all([
      queryClient.ensureQueryData(boardQuery(project.id)),
      // A link to a card opens with its drawer filled. A code the card had before it moved to another project goes
      // to where it is now (slice 20).
      deps.task
        ? queryClient
            .ensureQueryData(taskQuery({ projectId: project.id, number: taskNumberOf(deps.task) }))
            .catch(async (error: unknown) => {
              ignoreMissing(error);
              const placed = await queryClient.fetchQuery(
                orpc.transfer.resolve.queryOptions({
                  input: { projectId: project.id, number: taskNumberOf(deps.task ?? "") },
                }),
              );
              if (placed) {
                throw redirect({
                  to: "/projects/$projectKey",
                  params: { projectKey: placed.projectKey },
                  search: { task: taskCode({ key: placed.projectKey, number: placed.number }) },
                });
              }
            })
        : null,
      deps.task
        ? queryClient
            .ensureQueryData(timeQuery({ projectId: project.id, number: taskNumberOf(deps.task) }))
            .catch(ignoreMissing)
        : null,
    ]);
    // Returned as well as cached: `head` needs the name.
    return project;
  },
  head: (args) => pageMeta({ args, title: args.loaderData?.name ?? m.projects_title(), index: false }),
  component: BoardPage,
});

/*===== Board =====*/

/**
 * A project's board: its columns in one housing, laid out the way the person chose (`Board` holds them and the
 * dragging). The cancelled column joins them when the switch asks for it (`?cancelled=true`). A card's drawer opens
 * over it from `?task=`.
 */
function BoardPage() {
  const { projectKey } = Route.useParams();
  const search = Route.useSearch();
  const { task: openTask, cancelled: showCancelled = false } = search;
  const navigate = useNavigate({ from: Route.fullPath });
  const { viewerId, canEdit, isAdmin } = useBoardAccess();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data: board } = useSuspenseQuery(boardQuery(project.id));

  /*------ Lookups ------*/
  // Cards name people by id: the project's members, and anyone the board still mentions who has left it.
  const people = useMemo(
    () => new Map<string, Person>([...board.people, ...project.members].map((person) => [person.id, person])),
    [board.people, project.members],
  );
  const labels = useMemo(() => new Map(board.labels.map((label) => [label.id, label])), [board.labels]);

  /*------ Filters ------*/
  const { assignee, label, priority, due, blocked } = search;
  const filter = useMemo(() => {
    const current: BoardFilter = { assignee, label, priority, due, blocked };
    if (!isFiltering(current)) return null;
    const tasks = new Map(board.tasks.map((task) => [task.id, task]));
    const kinds = kindsOf(project);
    return cardFilter({
      filter: current,
      viewerId,
      today: teamToday(),
      isBlocked: (task) => blockersOf({ task, tasks, kinds }).length > 0,
    });
  }, [assignee, label, priority, due, blocked, board.tasks, project, viewerId]);
  const setFilter = (patch: Partial<BoardFilter>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  /*------ Columns ------*/
  const columns = project.columns.filter((column) => column.kind !== "cancelled");
  const hidden = useMemo(() => new Set(search.hide), [search.hide]);
  const setHidden = (ids: string[]) =>
    void navigate({ search: (previous) => ({ ...previous, hide: ids.length > 0 ? ids : undefined }), replace: true });

  // Anyone a card can be assigned to; viewers never are.
  const assignable = project.members.filter((member) => member.role !== "viewer");

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <div className="flex items-center gap-4">
        <h1 className="font-heading text-h2">{project.name}</h1>
        <Marking variant="code">{project.key}</Marking>
        {/* The label wraps the switch, so the whole row is its tap target. */}
        <label htmlFor={SHOW_CANCELLED_ID} className="ms-auto flex cursor-pointer items-center gap-3">
          <span className="text-body-sm font-semibold">{m.board_show_cancelled()}</span>
          <Switch
            id={SHOW_CANCELLED_ID}
            size="sm"
            checked={showCancelled}
            onCheckedChange={(checked) =>
              void navigate({ search: (previous) => ({ ...previous, cancelled: checked || undefined }), replace: true })
            }
          />
        </label>
        <BoardLayoutPicker />
        <AvatarGroup>
          {project.members.map((member) => (
            <PersonAvatar key={member.id} name={member.name} src={member.avatarUrl} />
          ))}
        </AvatarGroup>
        <Link
          to="/projects/$projectKey/calendar"
          params={{ projectKey: project.key }}
          search={{ assignee, label, priority, due, blocked }}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <CalendarDaysIcon data-icon="inline-start" />
          {m.calendar_link()}
        </Link>
        <Link
          to="/projects/$projectKey/activity"
          params={{ projectKey: project.key }}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <HistoryIcon data-icon="inline-start" />
          {m.activity_link()}
        </Link>
        <Link
          to="/projects/$projectKey/archive"
          params={{ projectKey: project.key }}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <ArchiveIcon data-icon="inline-start" />
          {m.archive_link()}
        </Link>
        {isAdmin && (
          <Link
            to="/projects/$projectKey/settings"
            params={{ projectKey: project.key }}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <SettingsIcon data-icon="inline-start" />
            {m.project_settings()}
          </Link>
        )}
      </div>

      {/*------ New Task, Filters and Columns Shown ------*/}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <NewTaskDialog
              projectId={project.id}
              projectKey={project.key}
              columns={columns}
              defaultColumnId={columns.find((column) => !hidden.has(column.id))?.id}
            />
          )}
          <BoardFilters
            filter={{ assignee, label, priority, due, blocked }}
            people={assignable}
            labels={board.labels}
            onChange={setFilter}
          />
        </div>
        <BoardColumnToggles columns={columns} hidden={hidden} onChange={setHidden} />
      </div>

      {/*------ Columns ------*/}
      <Card>
        <CardContent>
          <Board
            project={project}
            projectKey={projectKey}
            board={board}
            labels={labels}
            people={people}
            canMoveColumns={isAdmin}
            canMoveCards={canEdit}
            canTransfer={isAdmin}
            filter={filter}
            showCancelled={showCancelled}
            hiddenColumns={hidden}
          />
        </CardContent>
      </Card>

      {openTask && (
        <TaskDrawer
          key={openTask}
          code={openTask}
          project={project}
          board={board}
          people={people}
          onClose={() => void navigate({ search: (previous) => ({ ...previous, task: undefined }) })}
        />
      )}
    </div>
  );
}
