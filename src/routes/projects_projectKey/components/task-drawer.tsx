import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";

import { Marking } from "#/components/primitive/marking/marking";
import { Separator } from "#/components/primitive/separator/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/primitive/sheet/sheet";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import type { Person, Project } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Board, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ArchiveTaskButton } from "#/routes/projects_projectKey/components/archive-task-button";
import { LabelPicker } from "#/routes/projects_projectKey/components/label-picker";
import {
  DueDateField,
  EstimateField,
  PersonField,
  PriorityField,
} from "#/routes/projects_projectKey/components/task-meta-fields";
import { TaskDescriptionField } from "#/routes/projects_projectKey/components/task-description-field";
import { TaskTitleField } from "#/routes/projects_projectKey/components/task-title-field";
import { taskQuery } from "#/routes/projects_projectKey/queries";
import { taskNumberOf } from "#/routes/projects_projectKey/search-params";
import { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Task Drawer =====*/

/**
 * A card's details in a wide side panel over the board, opened by `?task=TD-42` so it has a link. Closing it drops the
 * param. Every field saves on its own, as it changes.
 */
export function TaskDrawer({
  code,
  project,
  board,
  people,
}: {
  code: string;
  project: Project;
  board: Board;
  people: Map<string, Person>;
}) {
  const navigate = useNavigate({ from: "/projects/$projectKey" });
  // Filled by the board's loader for a link; `useQuery` rather than suspense so a missing task says so in the panel.
  const { data: task, isPending } = useQuery({
    ...taskQuery({ projectId: project.id, number: taskNumberOf(code) }),
    retry: false,
  });
  const close = () => void navigate({ search: (previous) => ({ ...previous, task: undefined }) });

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent size="wide" className="overflow-y-auto">
        {task ? (
          <TaskDetails task={task} project={project} board={board} people={people} onArchived={close} />
        ) : (
          <SheetHeader>
            <SheetTitle>{code}</SheetTitle>
            <SheetDescription>
              {isPending ? <Spinner aria-label={m.common_loading()} /> : m.task_not_found()}
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

/*===== Details =====*/
function TaskDetails({
  task,
  project,
  board,
  people,
  onArchived,
}: {
  task: TaskDetail;
  project: Project;
  board: Board;
  people: Map<string, Person>;
  onArchived: () => void;
}) {
  const { viewer } = useRouteContext({ from: "/_site-layout/_app-layout" });
  const update = useTaskUpdate({ projectId: project.id, task });
  const code = taskCode({ key: project.key, number: task.number });
  const column = project.columns.find((item) => item.id === task.columnId);
  const creator = people.get(task.createdBy);
  const canHandOver = viewer.role === "admin" || viewer.id === task.ownerId;
  const archived = task.archivedAt !== null;

  return (
    <>
      {/*------ Header ------*/}
      <SheetHeader>
        <div className="flex items-center gap-3">
          <Marking variant="code">{code}</Marking>
          {column && <Marking>{columnTitle(column)}</Marking>}
        </div>
        <SheetTitle>{task.title}</SheetTitle>
        <SheetDescription>
          {m.task_created_by({ name: creator?.name ?? "", date: formatDate(task.createdAt) })}
        </SheetDescription>
      </SheetHeader>

      {archived ? (
        <p className="px-6">{m.task_archived_notice()}</p>
      ) : (
        <div className="grid grid-cols-3 gap-8 px-6 pb-6">
          {/*------ Main ------*/}
          <div className="col-span-2 flex min-w-0 flex-col gap-6">
            <TaskTitleField key={task.title} task={task} update={update} />
            <TaskDescriptionField task={task} update={update} />
            <Separator />
            <LabelPicker task={task} update={update} projectId={project.id} labels={board.labels} />
          </div>

          {/*------ Side ------*/}
          <div className="flex flex-col gap-5">
            <PriorityField task={task} update={update} />
            <PersonField task={task} update={update} field="assignee" members={project.members} people={people} />
            <PersonField
              task={task}
              update={update}
              field="owner"
              members={project.members}
              people={people}
              canEdit={canHandOver}
            />
            <DueDateField task={task} update={update} />
            <EstimateField key={task.estimateMinutes} task={task} update={update} />
            <Separator />
            <ArchiveTaskButton projectId={project.id} task={task} code={code} onArchived={onArchived} />
          </div>
        </div>
      )}
    </>
  );
}
