import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ListTodoIcon, XIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/primitive/card/card";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { DueMark } from "#/components/shared/due-mark/due-mark";
import { PageHead } from "#/components/shared/page-head/page-head";
import { remindersQuery, useReminderChanges, useReminders } from "#/hooks/use-reminders";
import { columnTitle } from "#/lib/column-title";
import { whenLabel } from "#/lib/reminder-time";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Reminder } from "#/orpc/reminder/contract";
import { taskCode } from "#/orpc/task/constants";
import type { MyTask } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/my-tasks")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(orpc.task.mine.queryOptions()),
      context.queryClient.ensureQueryData(remindersQuery()),
    ]),
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.my_tasks_title(), index: false }),
  component: MyTasksPage,
});

/*===== Page =====*/

/**
 * "My Tasks": every open task assigned to the viewer across their projects, one card per project, the work under way
 * first and then by due date (the order comes from `task.mine`), under the reminders they have waiting. Each row opens
 * the card's drawer on its board. Not in a viewer's navigation: nobody can assign them a task.
 */
function MyTasksPage() {
  const { data: tasks } = useSuspenseQuery(orpc.task.mine.queryOptions());
  const reminders = useReminders();
  // In the order the procedure sorted them: projects by name, each one's tasks as they came.
  const groups = new Map<string, MyTask[]>();
  for (const task of tasks) groups.set(task.projectKey, [...(groups.get(task.projectKey) ?? []), task]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <PageHead title={m.my_tasks_title()} description={m.my_tasks_description()} />

      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-h3">{m.reminder_list_title()}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col striped">
              {reminders.map((reminder) => (
                <ReminderRow key={reminder.taskId} reminder={reminder} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
              <ul className="flex flex-col striped">
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

/*===== Reminder Row =====*/

/** One waiting reminder: its card (opening it), its note, when it will ring and a key to remove it. */
function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { clear } = useReminderChanges();

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 md:grid md:grid-cols-12 md:gap-4">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:col-span-8">
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: reminder.projectKey }}
          search={{ task: reminder.taskCode }}
          className="flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Marking variant="code">{reminder.taskCode}</Marking>
          <span className="truncate font-semibold">{reminder.taskTitle}</span>
        </Link>
        {reminder.note && <span className="truncate text-body-sm text-muted-foreground">{reminder.note}</span>}
      </span>
      <span className="order-last flex basis-full items-center gap-2 text-body-sm md:order-none md:col-span-3 md:basis-auto">
        <Led signal="action" state="on" size="sm" />
        {whenLabel(reminder.remindAt)}
      </span>
      <span className="flex justify-end md:col-span-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.reminder_clear_card({ code: reminder.taskCode })}
          disabled={clear.isPending}
          onClick={() => clear.mutate({ projectId: reminder.projectId, taskId: reminder.taskId })}
        >
          <XIcon />
        </Button>
      </span>
    </li>
  );
}

/*===== Row =====*/

/** One task: its code and title (opening its card), its column and its due date. */
function MyTaskRow({ task }: { task: MyTask }) {
  const code = taskCode({ key: task.projectKey, number: task.number });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 md:grid md:grid-cols-12 md:gap-4">
      <Link
        to="/projects/$projectKey"
        params={{ projectKey: task.projectKey }}
        search={{ task: code }}
        className="flex min-w-0 basis-full items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:col-span-8 md:basis-auto"
      >
        <Marking variant="code">{code}</Marking>
        <span className="truncate font-semibold">{task.title}</span>
      </Link>
      <span className="flex items-center gap-2 text-body-sm md:col-span-2">
        <Led signal="positive" state={task.columnKind === "doing" ? "on" : "off"} size="sm" />
        {columnTitle({ kind: task.columnKind, name: task.columnName })}
      </span>
      <span className="ms-auto text-body-sm md:col-span-2 md:ms-0">
        {task.dueDate ? (
          <DueMark dueDate={task.dueDate} format={{ dateStyle: "medium" }} />
        ) : (
          <span className="text-muted-foreground">{m.my_tasks_no_due()}</span>
        )}
      </span>
    </li>
  );
}
