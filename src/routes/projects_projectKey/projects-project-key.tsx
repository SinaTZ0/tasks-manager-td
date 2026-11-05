import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { Card, CardContent } from "#/components/primitive/card/card";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import { teamToday } from "#/lib/team-day";
import { cardFilter, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { Board } from "#/routes/projects_projectKey/components/board";
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

export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey/")({
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
 * dragging), beside the project's sidebar, which holds its display and keys (`BoardSidebar`). The cancelled column joins
 * them when the switch asks for it (`?cancelled=true`). A card's drawer opens over it from `?task=`.
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
  const { q, assignee, label, priority, due, blocked } = search;
  const current: BoardFilter = { q, assignee, label, priority, due, blocked };
  const tasks = new Map(board.tasks.map((task) => [task.id, task]));
  const kinds = kindsOf(project);
  const filter = isFiltering(current)
    ? cardFilter({
        filter: current,
        projectKey: project.key,
        viewerId,
        today: teamToday(),
        isBlocked: (task) => blockersOf({ task, tasks, kinds }).length > 0,
      })
    : null;

  /*------ Columns ------*/
  const hidden = new Set(search.hide);

  return (
    <>
      {/*------ Columns ------*/}
      <Card className="m-6">
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
    </>
  );
}
