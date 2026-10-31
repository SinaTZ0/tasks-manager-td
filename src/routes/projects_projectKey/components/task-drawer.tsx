import { useQuery } from "@tanstack/react-query";
import { CopyIcon, FolderInputIcon, PaperclipIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Marking } from "#/components/primitive/marking/marking";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/primitive/resizable/resizable";
import { Separator } from "#/components/primitive/separator/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/primitive/sheet/sheet";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/primitive/tabs/tabs";
import { ActivityFeed } from "#/components/shared/activity-feed/activity-feed";
import { useShortcuts } from "#/hooks/use-shortcuts";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import type { ColumnKind } from "#/orpc/project/constants";
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
import { COMMENT_COMPOSER_ID, TaskComments } from "#/routes/projects_projectKey/components/task-comments";
import {
  TaskAttachments,
  useAttachmentDrop,
  useAttachmentUpload,
} from "#/routes/projects_projectKey/components/task-attachments";
import { TaskChecklist } from "#/routes/projects_projectKey/components/task-checklist";
import { TaskDelegation } from "#/routes/projects_projectKey/components/task-delegation";
import { TaskDependencies } from "#/routes/projects_projectKey/components/task-dependencies";
import { TaskStatusField } from "#/routes/projects_projectKey/components/task-status-field";
import { TaskStatusPanel } from "#/routes/projects_projectKey/components/task-status-panel";
import { TaskTimeSection } from "#/routes/projects_projectKey/components/task-time-section";
import { TaskWatchers } from "#/routes/projects_projectKey/components/task-watchers";
import { TaskTitleField, TITLE_FIELD_ID } from "#/routes/projects_projectKey/components/task-title-field";
import { TransferDialog, type TransferMode } from "#/routes/projects_projectKey/components/transfer-dialog";
import { blockersOf, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { taskQuery } from "#/routes/projects_projectKey/queries";
import { taskNumberOf } from "#/routes/projects_projectKey/search-params";
import { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Task Drawer =====*/

/**
 * A card's details in a panel floating over nearly the whole page, opened by `?task=TD-42` so it has a link. Closing it
 * drops the param. Under its header the card reads in three columns that scroll on their own and are resized by
 * dragging the rules between them: the work (the timer, then what the task is), the tabs (comments, checklist,
 * dependencies, history, time), and the details people look things up in, the task's status (done, stop, reopen)
 * first. Every field saves on its own, as it changes.
 */
export function TaskDrawer({
  code,
  project,
  board,
  people,
  onClose,
}: {
  code: string;
  project: Project;
  board: Board;
  people: Map<string, Person>;
  /** Closes it: the page drops `?task=` from its own address (the board's, the calendar's). */
  onClose: () => void;
}) {
  // Filled by the page's loader for a link; `useQuery` rather than suspense so a missing task says so in the panel.
  const { data: task, isPending } = useQuery({
    ...taskQuery({ projectId: project.id, number: taskNumberOf(code) }),
    retry: false,
  });
  const close = onClose;

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent size="page" className="overflow-hidden">
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
  const [tab, setTab] = useState<TaskTab>("comments");
  const [transfer, setTransfer] = useState<{ mode: TransferMode; open: boolean } | null>(null);

  /*------ Shortcuts ------*/
  // Slice 18: `e` edits the title, `c` writes a comment, `m` takes the card. Only for editors, on a live card.
  useShortcuts(
    readOnly || archived
      ? []
      : [
          {
            code: "KeyE",
            run: () => {
              const field = document.getElementById(TITLE_FIELD_ID);
              if (field instanceof HTMLInputElement) field.select();
            },
          },
          {
            code: "KeyC",
            run: () => {
              setTab("comments");
              // The comments panel mounts with the tab; its editor is there on the next frame.
              requestAnimationFrame(() => document.getElementById(COMMENT_COMPOSER_ID)?.focus());
            },
          },
          { code: "KeyM", run: () => task.assigneeId !== viewerId && update.save({ assigneeId: viewerId }) },
        ],
  );

  return (
    // Files dropped or pasted anywhere on the card become its attachments.
    <div {...drop.props} className="relative flex min-h-0 flex-1 flex-col">
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
        <p className="p-6">{m.task_archived_notice()}</p>
      ) : (
        // Each column scrolls on its own, so the thread stays in view while a field is worked on. The work column is
        // the narrowest: what's left in it is short, and the tabs beside it hold the long lists.
        <ResizablePanelGroup className="min-h-0 flex-1">
          {/*------ Work ------*/}
          <ResizablePanel defaultSize="30%" minSize={280}>
            <DrawerColumn label={m.task_column_work()} className="gap-6">
              <TaskStatusPanel task={task} project={project} readOnly={readOnly} />
              <TaskTitleField key={task.title} task={task} update={update} readOnly={readOnly} />
              <TaskDescriptionField task={task} update={update} readOnly={readOnly} />
              <Separator />
              <TaskAttachments
                task={task}
                projectId={project.id}
                people={people}
                uploads={uploads}
                readOnly={readOnly}
              />
            </DrawerColumn>
          </ResizablePanel>
          <ResizableHandle withHandle />

          {/*------ Tabs ------*/}
          {/* Never narrower than its row of five tabs (the English one is the longest), which doesn't wrap. */}
          <ResizablePanel defaultSize="46%" minSize={600}>
            <DrawerColumn label={m.task_column_tracking()}>
              <TaskTabs
                task={task}
                project={project}
                board={board}
                kinds={kinds}
                people={people}
                viewerId={viewerId}
                readOnly={readOnly}
                tab={tab}
                onTabChange={setTab}
              />
            </DrawerColumn>
          </ResizablePanel>
          <ResizableHandle withHandle />

          {/*------ Details ------*/}
          <ResizablePanel defaultSize="24%" minSize={320} maxSize="34%">
            <DrawerColumn label={m.task_column_details()} tinted className="gap-5">
              <TaskStatusField
                task={task}
                project={project}
                code={code}
                people={people}
                blockers={blockers}
                readOnly={readOnly}
              />
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
              <LabelPicker
                task={task}
                update={update}
                projectId={project.id}
                labels={board.labels}
                tasks={board.tasks}
                isAdmin={isAdmin}
                readOnly={readOnly}
              />
              <Separator />
              <TaskDelegation task={task} project={project} code={code} readOnly={readOnly} />
              <Separator />
              <TaskWatchers task={task} projectId={project.id} viewerId={viewerId} />
              {isAdmin && (
                <>
                  <Separator />
                  {/*------ Other Projects ------*/}
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setTransfer({ mode: "move", open: true })}>
                      <FolderInputIcon data-icon="inline-start" />
                      {m.transfer_move()}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setTransfer({ mode: "copy", open: true })}>
                      <CopyIcon data-icon="inline-start" />
                      {m.transfer_copy()}
                    </Button>
                  </div>
                  {transfer && column && (
                    <TransferDialog
                      key={transfer.mode}
                      projectId={project.id}
                      request={{ taskId: task.id, code, kind: column.kind, mode: transfer.mode }}
                      open={transfer.open}
                      onOpenChange={(open) => setTransfer({ ...transfer, open })}
                      // The moved card has left this board: its drawer closes.
                      onMoved={onArchived}
                    />
                  )}
                  <Separator />
                  <ArchiveTaskButton projectId={project.id} task={task} code={code} onArchived={onArchived} />
                </>
              )}
            </DrawerColumn>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}

/*===== Column =====*/

/**
 * One of the drawer's columns: a thin strip in the secondary colour, printed with what the column holds, then its
 * contents, which scroll under the strip so the name stays in view. The strip is print only; the column is a region
 * named the same, for screen readers. `tinted` lays the details column's muted plate under both.
 */
function DrawerColumn({
  label,
  tinted = false,
  className,
  children,
}: {
  label: string;
  tinted?: boolean;
  /** Spacing between the column's parts. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className={cn("flex h-full flex-col", tinted && "bg-muted/40")}>
      <div aria-hidden="true" className="flex shrink-0 items-center justify-center bg-secondary px-6 py-0.5">
        <Marking variant="secondary">{label}</Marking>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto p-6", className)}>{children}</div>
    </section>
  );
}

/*===== Tabs =====*/

/**
 * The drawer's middle column: the comment thread, the checklist, the dependencies, the task's history, and its time,
 * one at a time. Comments come first: they are what people come back to a card for.
 */
type TaskTab = "comments" | "checklist" | "dependencies" | "activity" | "time";

function TaskTabs({
  task,
  project,
  board,
  kinds,
  people,
  viewerId,
  readOnly,
  tab,
  onTabChange,
}: {
  task: TaskDetail;
  project: Project;
  board: Board;
  kinds: Map<string, ColumnKind>;
  people: Map<string, Person>;
  viewerId: string;
  readOnly: boolean;
  tab: TaskTab;
  onTabChange: (tab: TaskTab) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as TaskTab)}>
      <TabsList aria-label={m.task_tabs()}>
        <TabsTrigger value="comments">{m.task_tab_comments()}</TabsTrigger>
        <TabsTrigger value="checklist">{m.task_tab_checklist()}</TabsTrigger>
        <TabsTrigger value="dependencies">{m.task_tab_dependencies()}</TabsTrigger>
        <TabsTrigger value="activity">{m.task_tab_activity()}</TabsTrigger>
        <TabsTrigger value="time">{m.task_tab_time()}</TabsTrigger>
      </TabsList>
      <TabsContent value="comments">
        <TaskComments task={task} project={project} viewerId={viewerId} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="checklist">
        <TaskChecklist task={task} projectId={project.id} people={people} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="dependencies">
        <TaskDependencies task={task} project={project} board={board} kinds={kinds} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="activity">
        <TaskActivity task={task} project={project} people={people} />
      </TabsContent>
      <TabsContent value="time">
        <TaskTimeSection task={task} project={project} people={people} />
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
  return <ActivityFeed items={items} people={people} dayHeading="h3" />;
}
