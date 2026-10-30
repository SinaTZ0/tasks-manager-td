import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import { useMemo } from "react";

import { AvatarGroup } from "#/components/primitive/avatar/avatar";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { columnTitle } from "#/lib/column-title";
import { pageMeta } from "#/lib/seo";
import type { Person } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { BoardColumn } from "#/routes/projects_projectKey/components/board-column";
import { QuickAdd } from "#/routes/projects_projectKey/components/quick-add";
import { TaskCard } from "#/routes/projects_projectKey/components/task-card";
import { TaskDrawer } from "#/routes/projects_projectKey/components/task-drawer";
import { boardQuery, ensureProject, projectQuery, taskQuery } from "#/routes/projects_projectKey/queries";
import { boardSearchSchema, taskNumberOf } from "#/routes/projects_projectKey/search-params";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey")({
  validateSearch: boardSearchSchema,
  loaderDeps: ({ search }) => ({ task: search.task }),
  loader: async ({ context, params, deps }) => {
    const { queryClient } = context;
    const project = await ensureProject({ queryClient, projectKey: params.projectKey });
    await Promise.all([
      queryClient.ensureQueryData(boardQuery(project.id)),
      // A link to a card opens with its drawer filled. A task that isn't there leaves the drawer to say so.
      deps.task
        ? queryClient
            .ensureQueryData(taskQuery({ projectId: project.id, number: taskNumberOf(deps.task) }))
            .catch((error: unknown) => {
              if (!(error instanceof ORPCError && error.code === "NOT_FOUND")) throw error;
            })
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
 * A project's board: every column but the cancelled one in one housing, side by side, wider than the window, so the
 * row scrolls. A card's drawer opens over it from `?task=`.
 */
function BoardPage() {
  const { projectKey } = Route.useParams();
  const { task: openTask } = Route.useSearch();
  const { viewer } = Route.useRouteContext();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data: board } = useSuspenseQuery(boardQuery(project.id));
  const columns = project.columns.filter((column) => column.kind !== "cancelled");

  /*------ Lookups ------*/
  // Cards name people by id: the project's members, and anyone the board still mentions who has left it.
  const people = useMemo(
    () => new Map<string, Person>([...board.people, ...project.members].map((person) => [person.id, person])),
    [board.people, project.members],
  );
  const labels = useMemo(() => new Map(board.labels.map((label) => [label.id, label])), [board.labels]);

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <div className="flex items-center gap-4">
        <h1 className="font-heading text-h2">{project.name}</h1>
        <Marking variant="code">{project.key}</Marking>
        <AvatarGroup className="ms-auto">
          {project.members.map((member) => (
            <PersonAvatar key={member.id} name={member.name} />
          ))}
        </AvatarGroup>
        {viewer.role === "admin" && (
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

      {/*------ Columns ------*/}
      <Card>
        <CardContent>
          {/* Browsers make a scrolling box keyboard-focusable themselves, so it gets the focus ring but no `tabIndex`. */}
          <section
            aria-label={m.board_columns()}
            className="-m-2 flex items-start gap-6 overflow-x-auto p-2 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {columns.map((column) => {
              const title = columnTitle(column);
              const tasks = board.tasks.filter((task) => task.columnId === column.id);
              return (
                <BoardColumn
                  key={column.id}
                  title={title}
                  count={tasks.length}
                  wipLimit={column.wipLimit}
                  footer={<QuickAdd projectId={project.id} columnId={column.id} columnTitle={title} />}
                >
                  <ol className="flex flex-col gap-3">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <TaskCard task={task} projectKey={project.key} labels={labels} people={people} />
                      </li>
                    ))}
                  </ol>
                </BoardColumn>
              );
            })}
          </section>
        </CardContent>
      </Card>

      {openTask && <TaskDrawer key={openTask} code={openTask} project={project} board={board} people={people} />}
    </div>
  );
}
