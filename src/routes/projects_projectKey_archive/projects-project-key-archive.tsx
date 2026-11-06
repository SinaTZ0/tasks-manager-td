import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Card, CardContent } from "#/components/primitive/card/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/primitive/dialog/dialog";
import { Marking } from "#/components/primitive/marking/marking";
import { toast } from "#/components/primitive/toast/toast";
import { PageHead } from "#/components/shared/page-head/page-head";
import { describeApiFailure } from "#/lib/api-error";
import { columnTitle } from "#/lib/column-title";
import { formatDate, formatList } from "#/lib/locale";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { ArchivedTask } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Queries =====*/
const archiveQuery = (projectId: string) => orpc.task.archived.queryOptions({ input: { projectId } });

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey/archive")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const project = await ensureProject({ queryClient, projectKey: params.projectKey });
    await queryClient.ensureQueryData(archiveQuery(project.id));
    // Returned as well as cached: `head` needs the name.
    return project;
  },
  head: (args) => pageMeta({ args, title: m.archive_heading({ project: args.loaderData?.name ?? "" }), index: false }),
  component: ArchivePage,
});

/*===== Page =====*/

/**
 * A project's archive (docs/app.md → Archive & restore, rule 10): the tasks taken off its board, most recently archived
 * first. An admin can put one back or delete it for good, after confirming; members see the list read-only.
 */
function ArchivePage() {
  const { projectKey } = Route.useParams();
  const { viewer } = Route.useRouteContext();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data } = useSuspenseQuery(archiveQuery(project.id));
  const people = new Map(data.people.map((person) => [person.id, person]));

  return (
    <div className="mx-auto flex w-full max-w-site flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      {/*------ Header ------*/}
      <PageHead
        title={m.archive_link()}
        description={viewer.role === "admin" ? m.archive_description() : m.archive_description_member()}
      />

      {/*------ List ------*/}
      <Card>
        <CardContent>
          {data.tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <ArchiveIcon className="size-8" />
              <p>{m.archive_empty()}</p>
            </div>
          ) : (
            <ul className="flex flex-col striped">
              {data.tasks.map((task) => (
                <ArchivedRow
                  key={task.id}
                  task={task}
                  project={project}
                  assigneeNames={task.assigneeIds.flatMap((id) => people.get(id)?.name ?? [])}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*===== Row =====*/

/** One archived task: its code and title (opening its read-only drawer), column, assignees, when, and its keys. */
function ArchivedRow({
  task,
  project,
  assigneeNames,
}: {
  task: ArchivedTask;
  project: Project;
  assigneeNames: string[];
}) {
  const { viewer } = useRouteContext({ from: "/_site-layout/_app-layout" });
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const code = taskCode({ key: project.key, number: task.number });
  const column = project.columns.find((item) => item.id === task.columnId);
  const changed = () => queryClient.invalidateQueries({ queryKey: orpc.task.key() });

  const restore = useMutation(
    orpc.task.restore.mutationOptions({
      onSuccess: () => toast.add({ title: m.archive_restored({ code }), type: "success" }),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.archive_restore_failed() });
        toast.add({ title: failure.message ?? m.archive_restore_failed(), type: "error" });
      },
      onSettled: changed,
    }),
  );
  const remove = useMutation(
    orpc.task.delete.mutationOptions({
      onSuccess: () => {
        setConfirming(false);
        toast.add({ title: m.archive_deleted({ code }), type: "success" });
      },
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.archive_delete_failed() });
        toast.add({ title: failure.message ?? m.archive_delete_failed(), type: "error" });
      },
      onSettled: changed,
    }),
  );

  return (
    <li className="flex items-center gap-x-6 gap-y-2 py-3 max-md:flex-wrap">
      <div className="flex min-w-0 flex-1 flex-col gap-1 max-md:basis-full">
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: project.key }}
          search={{ task: code }}
          className="flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Marking variant="code">{code}</Marking>
          <span className="truncate font-semibold">{task.title}</span>
        </Link>
        <span className="text-body-sm text-muted-foreground">
          {[column && columnTitle(column), assigneeNames.length > 0 ? formatList(assigneeNames) : m.task_unassigned()]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <span className="text-caption text-muted-foreground">
        {m.archive_archived_on({ date: formatDate(task.archivedAt, { dateStyle: "medium" }) })}
      </span>
      {viewer.role === "admin" && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={restore.isPending}
            onClick={() => restore.mutate({ projectId: project.id, taskId: task.id })}
          >
            <ArchiveRestoreIcon data-icon="inline-start" />
            {m.archive_restore()}
            <span className="sr-only"> {code}</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
            <Trash2Icon data-icon="inline-start" />
            {m.archive_delete()}
            <span className="sr-only"> {code}</span>
          </Button>
        </div>
      )}

      {/*------ Confirm ------*/}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.archive_delete_title({ code })}</DialogTitle>
            <DialogDescription>{m.archive_delete_description()}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ projectId: project.id, taskId: task.id })}
            >
              {m.archive_delete_confirm()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
