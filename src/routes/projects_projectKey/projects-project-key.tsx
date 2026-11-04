import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { Toggle } from "#/components/primitive/toggle/toggle";
import { BOARD_PANEL_ID } from "#/components/shared/board-panel-toggle/board-panel-toggle";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import { teamToday } from "#/lib/team-day";
import { cardFilter, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { BoardDisplay } from "#/routes/projects_projectKey/components/board-display";
import { BoardFilters } from "#/routes/projects_projectKey/components/board-filters";
import { BoardLayoutPicker } from "#/routes/projects_projectKey/components/board-layout-picker";
import { NewTaskDialog } from "#/routes/projects_projectKey/components/new-task-dialog";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
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
  const people = new Map<string, Person>([...board.people, ...project.members].map((person) => [person.id, person]));
  const labels = new Map(board.labels.map((label) => [label.id, label]));

  /*------ Filters ------*/
  const { assignee, label, priority, due, blocked } = search;
  const current: BoardFilter = { assignee, label, priority, due, blocked };
  const tasks = new Map(board.tasks.map((task) => [task.id, task]));
  const kinds = kindsOf(project);
  const filter = isFiltering(current)
    ? cardFilter({
        filter: current,
        viewerId,
        today: teamToday(),
        isBlocked: (task) => blockersOf({ task, tasks, kinds }).length > 0,
      })
    : null;
  const setFilter = (patch: Partial<BoardFilter>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  /*------ Columns ------*/
  const columns = project.columns.filter((column) => column.kind !== "cancelled");
  const hidden = new Set(search.hide);
  const setHidden = (ids: string[]) =>
    void navigate({ search: (previous) => ({ ...previous, hide: ids.length > 0 ? ids : undefined }), replace: true });

  // Anyone a card can be assigned to; viewers never are.
  const assignable = project.members.filter((member) => member.role !== "viewer");

  return (
    <div className="flex items-start gap-6 px-6 py-6">
      {/*===== Side Rail =====*/}
      {/* The project's front panel, turned on its side into a channel strip beside the columns, so they get the window's
          whole height. A key in the header folds it away (src/lib/board-panel.ts); the filters still apply, and the
          columns say "3 of 9". It narrows as the columns slide into its place (`board-panel-fold`, src/styles.css);
          folded, its negative margin takes back the page's `gap-6`. It stays in view down a long board. */}
      <section
        id={BOARD_PANEL_ID}
        aria-label={project.name}
        className="board-panel-fold sticky top-6 board-panel-closed:-me-6"
      >
        <Card size="sm" className="w-68">
          <CardContent>
            <div className="flex flex-col gap-3.5">
              {/*------ Name ------*/}
              <div className="flex flex-col">
                <h1 className="font-heading text-h1">{project.name}</h1>
                <span className="flex items-center gap-3">
                  <Marking variant="code">{project.key}</Marking>
                  <AvatarGroup>
                    {project.members.map((member) => (
                      <PersonAvatar key={member.id} name={member.name} src={member.avatarUrl} />
                    ))}
                  </AvatarGroup>
                </span>
              </div>

              {isAdmin && (
                <div className="flex *:flex-1">
                  <NewTaskDialog
                    projectId={project.id}
                    projectKey={project.key}
                    columns={columns}
                    defaultColumnId={columns.find((column) => !hidden.has(column.id))?.id}
                  />
                </div>
              )}

              <BoardDisplay project={project} board={board} hidden={hidden} onHiddenChange={setHidden} />

              {/*------ Keys ------*/}
              <BoardFilters
                filter={current}
                people={assignable}
                labels={board.labels}
                onChange={setFilter}
                layout="grid"
              >
                <Toggle
                  id={SHOW_CANCELLED_ID}
                  size="md"
                  signal="selection"
                  aria-label={m.board_show_cancelled()}
                  pressed={showCancelled}
                  onPressedChange={(pressed) =>
                    void navigate({
                      search: (previous) => ({ ...previous, cancelled: pressed || undefined }),
                      replace: true,
                    })
                  }
                  className="w-full"
                >
                  {m.board_mark_cancelled()}
                </Toggle>
              </BoardFilters>
              <BoardLayoutPicker />

              {/*------ Pages ------*/}
              <div className="h-px bg-border" />
              <ProjectPages projectKey={project.key} isAdmin={isAdmin} filter={current} layout="grid" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/*------ Columns ------*/}
      <Card className="min-w-0 flex-1">
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

      <TaskDrawer
        code={openTask}
        project={project}
        board={board}
        people={people}
        onClose={() => void navigate({ search: (previous) => ({ ...previous, task: undefined }) })}
      />
    </div>
  );
}
