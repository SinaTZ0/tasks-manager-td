import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ForwardIcon } from "lucide-react";

import { Card, CardContent } from "#/components/primitive/card/card";
import { Marking } from "#/components/primitive/marking/marking";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { DelegatedTask } from "#/orpc/delegation/contract";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/delegated")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.delegation.mine.queryOptions()),
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.delegated_title(), index: false }),
  component: DelegatedPage,
});

/*===== Page =====*/

/**
 * "Delegated by me" (docs/app.md → Assign & Delegate): the tasks the viewer handed on, or owns and someone handed on,
 * that someone else is doing now, across their projects, latest hand-off first. The owner answers for them still
 * (rule 6), so this is where they keep an eye on them. Each opens its card on its board.
 */
function DelegatedPage() {
  const { data: tasks } = useSuspenseQuery(orpc.delegation.mine.queryOptions());

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-h2">{m.delegated_title()}</h1>
        <p className="text-muted-foreground">{m.delegated_description()}</p>
      </div>

      <Card>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <ForwardIcon className="size-8" />
              <p>{m.delegated_empty()}</p>
            </div>
          ) : (
            <ul className="flex flex-col striped">
              {tasks.map((task) => (
                <DelegatedRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*===== Row =====*/

/** One task: its code and title (opening its card), project and column, who has it, and its latest hand-off. */
function DelegatedRow({ task }: { task: DelegatedTask }) {
  const code = taskCode({ key: task.projectKey, number: task.number });

  return (
    <li className="grid grid-cols-12 items-center gap-4 py-3">
      <div className="col-span-5 flex min-w-0 flex-col gap-1">
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: task.projectKey }}
          search={{ task: code }}
          className="flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Marking variant="code">{code}</Marking>
          <span className="truncate font-semibold">{task.title}</span>
        </Link>
        <span className="text-body-sm text-muted-foreground">
          {task.projectName} · {columnTitle({ kind: task.columnKind, name: task.columnName })}
        </span>
      </div>
      <div className="col-span-2 flex flex-col gap-0.5">
        <span className="text-caption text-muted-foreground">{m.task_assignee_label()}</span>
        <span className="text-body-sm font-semibold">{task.assigneeName ?? m.task_unassigned()}</span>
      </div>
      <div className="col-span-5 flex min-w-0 flex-col gap-0.5">
        <span className="text-caption text-muted-foreground">
          {m.delegation_entry({
            from: task.last.fromName,
            to: task.last.toName,
            date: formatDate(task.last.at, { dateStyle: "medium" }),
          })}
        </span>
        {task.last.note && <span className="truncate text-body-sm">{task.last.note}</span>}
        {!task.owned && <Marking>{m.delegated_not_owner()}</Marking>}
      </div>
    </li>
  );
}
