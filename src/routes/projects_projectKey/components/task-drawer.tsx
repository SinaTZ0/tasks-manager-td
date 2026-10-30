import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PaperclipIcon } from "lucide-react";

import { Marking } from "#/components/primitive/marking/marking";
import { Separator } from "#/components/primitive/separator/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/primitive/sheet/sheet";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/primitive/tabs/tabs";
import { ActivityFeed } from "#/components/shared/activity-feed/activity-feed";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import type { Person, Project } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Board, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { ArchiveTaskButton } from "#/routes/projects_projectKey/components/archive-task-button";
import { LabelPicker } from "#/routes/projects_projectKey/components/label-picker";
import {
  DueDateField,
  EstimateField,
  PersonField,
  PriorityField,
} from "#/routes/projects_projectKey/components/task-meta-fields";
import { TaskDescriptionField } from "#/routes/projects_projectKey/components/task-description-field";
import { TaskComments } from "#/routes/projects_projectKey/components/task-comments";
import {
  TaskAttachments,
  useAttachmentDrop,
  useAttachmentUpload,
} from "#/routes/projects_projectKey/components/task-attachments";
import { TaskChecklist } from "#/routes/projects_projectKey/components/task-checklist";
import { TaskDelegation } from "#/routes/projects_projectKey/components/task-delegation";
import { TaskDependencies } from "#/routes/projects_projectKey/components/task-dependencies";
import { TaskStatusPanel } from "#/routes/projects_projectKey/components/task-status-panel";
import { TaskTimeSection } from "#/routes/projects_projectKey/components/task-time-section";
import { TaskWatchers } from "#/routes/projects_projectKey/components/task-watchers";
import { TaskTitleField } from "#/routes/projects_projectKey/components/task-title-field";
import { blockersOf, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { taskQuery } from "#/routes/projects_projectKey/queries";
import { taskNumberOf } from "#/routes/projects_projectKey/search-params";
import { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Task Drawer =====*/

/**
 * A card's details in a wide side panel over the board, opened by `?task=TD-42` so it has a link. Closing it drops the
 * param. Its status and timer keys sit on top, its time at the bottom; every field saves on its own, as it changes.
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
  const { viewerId, canEdit, isAdmin } = useBoardAccess();
  // A viewer reads the drawer: every field shows its value, and no key changes anything.
  const readOnly = !canEdit;
  const update = useTaskUpdate({ projectId: project.id, task });
  const code = taskCode({ key: project.key, number: task.number });
  const column = project.columns.find((item) => item.id === task.columnId);
  const creator = people.get(task.createdBy);
  const canHandOver = canEdit && (isAdmin || viewerId === task.ownerId);
  const archived = task.archivedAt !== null;
  const kinds = kindsOf(project);
  const uploads = useAttachmentUpload({ projectId: project.id, task });
  const drop = useAttachmentDrop({ upload: uploads.upload, enabled: canEdit && !archived });
  const blockers = blockersOf({ task, tasks: new Map(board.tasks.map((item) => [item.id, item])), kinds }).map(
    (blocker) => taskCode({ key: project.key, number: blocker.number }),
  );

  return (
    // Files dropped or pasted anywhere on the card become its attachments.
    <div {...drop.props} className="relative flex flex-col gap-4">
      {drop.over && (
        <div className="pointer-events-none absolute inset-2 z-20 rounded-housing border-2 border-dashed border-ring bg-background/90">
          {/* Sticky, so the label stays in view however far the drawer is scrolled. */}
          <p className="sticky top-1/3 mx-auto mt-48 flex w-fit items-center gap-2 rounded-housing border border-border bg-card px-6 py-4 font-heading text-h4 shadow-housing">
            <PaperclipIcon aria-hidden="true" className="size-5" />
            {m.attachment_drop_here()}
          </p>
        </div>
      )}

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
            <TaskStatusPanel
              task={task}
              project={project}
              code={code}
              people={people}
              blockers={blockers}
              readOnly={readOnly}
            />
            <TaskTitleField key={task.title} task={task} update={update} readOnly={readOnly} />
            <TaskDescriptionField task={task} update={update} readOnly={readOnly} />
            <Separator />
            <TaskChecklist task={task} projectId={project.id} people={people} readOnly={readOnly} />
            <Separator />
            <TaskAttachments task={task} projectId={project.id} people={people} uploads={uploads} readOnly={readOnly} />
            <Separator />
            <LabelPicker task={task} update={update} projectId={project.id} labels={board.labels} readOnly={readOnly} />
            <Separator />
            <TaskDependencies task={task} project={project} board={board} kinds={kinds} readOnly={readOnly} />
            <Separator />
            <TaskTabs task={task} project={project} people={people} viewerId={viewerId} readOnly={readOnly} />
          </div>

          {/*------ Side ------*/}
          <div className="flex flex-col gap-5">
            <PriorityField task={task} update={update} readOnly={readOnly} />
            <PersonField
              task={task}
              update={update}
              field="assignee"
              members={project.members}
              people={people}
              canEdit={canEdit}
            />
            <PersonField
              task={task}
              update={update}
              field="owner"
              members={project.members}
              people={people}
              canEdit={canHandOver}
              explainLock={canEdit}
            />
            <DueDateField
              task={task}
              update={update}
              readOnly={readOnly}
              finished={column?.kind === "done" || column?.kind === "cancelled"}
            />
            <EstimateField key={task.estimateMinutes} task={task} update={update} readOnly={readOnly} />
            <Separator />
            <TaskDelegation task={task} project={project} code={code} readOnly={readOnly} />
            <Separator />
            <TaskWatchers task={task} projectId={project.id} viewerId={viewerId} />
            {isAdmin && (
              <>
                <Separator />
                <ArchiveTaskButton projectId={project.id} task={task} code={code} onArchived={onArchived} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*===== Tabs =====*/

/**
 * The drawer's lower half: the comment thread, the task's history, and its time, one at a time. Comments come first:
 * they are what people come back to a card for.
 */
function TaskTabs({
  task,
  project,
  people,
  viewerId,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  people: Map<string, Person>;
  viewerId: string;
  readOnly: boolean;
}) {
  return (
    <Tabs defaultValue="comments">
      <TabsList aria-label={m.task_tabs()}>
        <TabsTrigger value="comments">{m.task_tab_comments()}</TabsTrigger>
        <TabsTrigger value="activity">{m.task_tab_activity()}</TabsTrigger>
        <TabsTrigger value="time">{m.task_tab_time()}</TabsTrigger>
      </TabsList>
      <TabsContent value="comments">
        <TaskComments task={task} project={project} viewerId={viewerId} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="activity">
        <TaskActivity task={task} project={project} people={people} />
      </TabsContent>
      <TabsContent value="time">
        <TaskTimeSection task={task} project={project} people={people} viewerId={viewerId} readOnly={readOnly} />
      </TabsContent>
    </Tabs>
  );
}

/** The task's history, newest first; fetched when the tab is first opened. */
function TaskActivity({ task, project, people }: { task: TaskDetail; project: Project; people: Map<string, Person> }) {
  const { data: items } = useQuery(
    orpc.activity.forTask.queryOptions({ input: { projectId: project.id, taskId: task.id } }),
  );
  if (!items) return <Spinner aria-label={m.common_loading()} />;
  return <ActivityFeed items={items} people={people} />;
}
