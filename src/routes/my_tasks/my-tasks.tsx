import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ListTodoIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { useNow } from "#/hooks/use-now";
import { columnTitle } from "#/lib/column-title";
import { formatClock, liveSeconds } from "#/lib/duration";
import { formatDate, isoToDate } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import { taskCode } from "#/orpc/task/constants";
import type { MyTask } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/my-tasks")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.task.mine.queryOptions()),
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.my_tasks_title(), index: false }),
  component: MyTasksPage,
});

/*===== Page =====*/

/**
 * "My Tasks": every open task assigned to the viewer across their projects, one card per project, the work under way
 * first and then by due date (the order comes from `task.mine`). Each row opens the card's drawer on its board. Not in
 * a viewer's navigation: nobody can assign them a task.
 */
function MyTasksPage() {
  const { data: tasks } = useSuspenseQuery(orpc.task.mine.queryOptions());
  // In the order the procedure sorted them: projects by name, each one's tasks as they came.
  const groups = new Map<string, MyTask[]>();
  for (const task of tasks) groups.set(task.projectKey, [...(groups.get(task.projectKey) ?? []), task]);

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-h2">{m.my_tasks_title()}</h1>
        <p className="text-muted-foreground">{m.my_tasks_description()}</p>
      </div>

      {groups.size === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <ListTodoIcon className="size-8" />
              <p>{m.my_tasks_empty()}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        [...groups].map(([projectKey, items]) => (
          <Card key={projectKey}>
            <CardHeader>
              <CardTitle>
                <h2 className="flex items-center gap-3 text-h3">
                  <Link to="/projects/$projectKey" params={{ projectKey }} className="hover:underline">
                    {items[0]?.projectName}
                  </Link>
                  <Marking variant="code">{projectKey}</Marking>
                </h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {items.map((task) => (
                  <MyTaskRow key={task.id} task={task} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/*===== Row =====*/

/** One task: its code and title (opening its card), its column, its due date and its time, ticking while it runs. */
function MyTaskRow({ task }: { task: MyTask }) {
  const code = taskCode({ key: task.projectKey, number: task.number });
  const running = task.runningSince.length > 0;

  return (
    <li className="grid grid-cols-12 items-center gap-4 py-3">
      <Link
        to="/projects/$projectKey"
        params={{ projectKey: task.projectKey }}
        search={{ task: code }}
        className="col-span-6 flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Marking variant="code">{code}</Marking>
        <span className="truncate font-semibold">{task.title}</span>
      </Link>
      <span className="col-span-2 flex items-center gap-2 text-body-sm">
        <Led signal="positive" state={task.columnKind === "doing" ? "on" : "off"} size="sm" />
        {columnTitle({ kind: task.columnKind, name: task.columnName })}
      </span>
      <span className="col-span-2 text-body-sm">
        {task.dueDate ? (
          <>
            <span className="sr-only">{m.task_due_label()}: </span>
            {formatDate(isoToDate(task.dueDate))}
          </>
        ) : (
          <span className="text-muted-foreground">{m.my_tasks_no_due()}</span>
        )}
      </span>
      <span className="col-span-2 flex items-center justify-end gap-2">
        {running ? <RunningTime task={task} /> : task.spentSeconds >= 60 && <Spent seconds={task.spentSeconds} />}
      </span>
    </li>
  );
}

/** While a timer runs on the task: a blinking LED and its total, ticking. */
function RunningTime({ task }: { task: MyTask }) {
  const now = useNow();
  return (
    <>
      <Led signal="positive" state="blink" size="sm" label={m.task_run_running()} />
      <Spent seconds={liveSeconds({ ...task, now })} />
    </>
  );
}

function Spent({ seconds }: { seconds: number }) {
  return (
    <Marking variant="code">
      <span className="sr-only">{m.time_spent_label()}: </span>
      <bdi dir="ltr">{formatClock(seconds)}</bdi>
    </Marking>
  );
}
