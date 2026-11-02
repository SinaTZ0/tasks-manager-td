import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  CopyIcon,
  FileTextIcon,
  FolderInputIcon,
  HistoryIcon,
  PaperclipIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Marking } from "#/components/primitive/marking/marking";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/primitive/resizable/resizable";
import { Separator } from "#/components/primitive/separator/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/primitive/sheet/sheet";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { ToggleGroup, ToggleGroupItem } from "#/components/primitive/toggle-group/toggle-group";
import { ActivityFeed } from "#/components/shared/activity-feed/activity-feed";
import { useNow } from "#/hooks/use-now";
import { useShortcuts } from "#/hooks/use-shortcuts";
import { formatDate, formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import type { Person, Project } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Board, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { ArchiveTaskButton } from "#/routes/projects_projectKey/components/archive-task-button";
import { LabelPicker } from "#/routes/projects_projectKey/components/label-picker";
import {
  AssigneesField,
  DueDateField,
  EstimateField,
  OwnerField,
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
import { TaskStatusTrack } from "#/routes/projects_projectKey/components/task-status-track";
import { formatSpan, secondsBetween, TaskTimeSection } from "#/routes/projects_projectKey/components/task-time-section";
import { TaskWatchers } from "#/routes/projects_projectKey/components/task-watchers";
import { TaskTitle } from "#/routes/projects_projectKey/components/task-title-field";
import { TransferDialog, type TransferMode } from "#/routes/projects_projectKey/components/transfer-dialog";
import { blockersOf, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { taskQuery } from "#/routes/projects_projectKey/queries";
import { taskNumberOf } from "#/routes/projects_projectKey/search-params";
import { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Task Drawer =====*/

/**
 * A card's details in a panel floating over nearly the whole page, opened by `?task=TD-42` so it has a link. Closing it
 * drops the param. Its header says what the task is (its code, its title, edited in place) and where it stands: the
 * status track, the board's columns with the current one lit, the next step a key away and the viewer's work key at
 * its start. Under it the card reads in up to three columns that scroll on their own and are resized by dragging the
 * rules between them: the work (what the task is, its checklist, attachments and thread), the tracking (time,
 * dependencies, history) and the details people look things up in (priority, people, dates, labels, delegation). Folder
 * tabs standing on the header's rule switch each column on and off, each printing a summary of what it holds; only the
 * work shows at first, so the task itself is what a card opens on. Every field saves on its own, as it changes.
 *
 * The page keeps it mounted whether a task is open or not, so the sheet sees `open` change and plays its CSS enter and
 * exit (`sheet.styles.ts`): Base UI skips the enter of a sheet that mounts already open, and one unmounted with the
 * param would vanish at once. A link opened in a new tab still shows the drawer open without animating in.
 *
 * Which columns show is kept here, above the task, so a choice carries over from one card to the next while the board
 * stays open. The panel is only as wide as its columns need (`SHEET_WIDTHS`) and glides wider or narrower as one is
 * switched on or off.
 */
export function TaskDrawer({
  code,
  project,
  board,
  people,
  onClose,
}: {
  /** The open task's code from `?task=`, or `undefined` while the drawer is closed. */
  code: string | undefined;
  project: Project;
  board: Board;
  people: Map<string, Person>;
  /** Closes it: the page drops `?task=` from its own address (the board's, the calendar's). */
  onClose: () => void;
}) {
  // The last task shown stays in the panel while it plays its way out after the param is gone.
  const [lastCode, setLastCode] = useState(code);
  if (code !== undefined && code !== lastCode) setLastCode(code);
  const shown = code ?? lastCode;
  const [columns, setColumns] = useState<DrawerColumnKey[]>(["work"]);

  return (
    <Sheet open={code !== undefined} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        size="page"
        className="overflow-hidden"
        style={{ "--sheet-page-width": SHEET_WIDTHS[columns.length] } as CSSProperties}
      >
        {/* Keyed by the task, so moving to another task (a dependency's link) starts its details afresh. */}
        {shown && (
          <DrawerBody
            key={shown}
            code={shown}
            project={project}
            board={board}
            people={people}
            columns={columns}
            onColumnsChange={setColumns}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/** One task's details, or what the panel says while it loads or when there is no such task. */
function DrawerBody({
  code,
  project,
  board,
  people,
  columns,
  onColumnsChange,
  onClose,
}: {
  code: string;
  project: Project;
  board: Board;
  people: Map<string, Person>;
  columns: DrawerColumnKey[];
  onColumnsChange: (columns: DrawerColumnKey[]) => void;
  onClose: () => void;
}) {
  // Filled by the page's loader for a link; `useQuery` rather than suspense so a missing task says so in the panel.
  const { data: task, isPending } = useQuery({
    ...taskQuery({ projectId: project.id, number: taskNumberOf(code) }),
    retry: false,
  });

  if (task) {
    return (
      <TaskDetails
        task={task}
        project={project}
        board={board}
        people={people}
        columns={columns}
        onColumnsChange={onColumnsChange}
        onArchived={onClose}
      />
    );
  }
  return (
    <SheetHeader>
      <SheetTitle>{code}</SheetTitle>
      <SheetDescription>
        {isPending ? <Spinner aria-label={m.common_loading()} /> : m.task_not_found()}
      </SheetDescription>
    </SheetHeader>
  );
}

/*===== Details =====*/
function TaskDetails({
  task,
  project,
  board,
  people,
  columns,
  onColumnsChange,
  onArchived,
}: {
  task: TaskDetail;
  project: Project;
  board: Board;
  people: Map<string, Person>;
  columns: DrawerColumnKey[];
  onColumnsChange: (columns: DrawerColumnKey[]) => void;
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
  const sizes = columnSizes(columns);
  // The columns just switched on, which fade in; the ones already showing stay still while the group lays out afresh.
  const [entering, setEntering] = useState<DrawerColumnKey[]>([]);
  const showColumns = (next: DrawerColumnKey[]) => {
    setEntering(next.filter((key) => !columns.includes(key)));
    onColumnsChange(next);
  };
  const [editingTitle, setEditingTitle] = useState(false);
  const [transfer, setTransfer] = useState<{ mode: TransferMode; open: boolean } | null>(null);

  /*------ Shortcuts ------*/
  // Slice 18: `e` edits the title, `c` writes a comment, `m` takes the card. Only for editors, on a live card.
  useShortcuts(
    readOnly || archived
      ? []
      : [
          { code: "KeyE", run: () => setEditingTitle(true) },
          {
            code: "KeyC",
            run: () => {
              if (!columns.includes("work")) showColumns(["work", ...columns]);
              // The thread is at the end of the work column, which may only mount with this key; its editor is there
              // on the next frame.
              requestAnimationFrame(() => {
                const composer = document.getElementById(COMMENT_COMPOSER_ID);
                composer?.scrollIntoView({ block: "center" });
                composer?.focus();
              });
            },
          },
          // Joins the assignees; the others stay.
          {
            code: "KeyM",
            run: () =>
              !task.assigneeIds.includes(viewerId) && update.save({ assigneeIds: [...task.assigneeIds, viewerId] }),
          },
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
      <SheetHeader tabbed={!archived}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Marking variant="code">{code}</Marking>
          <SheetDescription>
            {m.task_created_by({ name: creator?.name ?? "", date: formatDate(task.createdAt) })}
          </SheetDescription>
        </div>
        <TaskTitle
          key={task.title}
          task={task}
          update={update}
          readOnly={readOnly || archived}
          editing={editingTitle}
          onEditingChange={setEditingTitle}
        />

        {!archived && (
          <>
            {/*------ Status ------*/}
            <div className="mt-4">
              <TaskStatusTrack
                task={task}
                project={project}
                board={board}
                code={code}
                people={people}
                blockers={blockers}
                readOnly={readOnly}
              />
            </div>

            {/*------ Column Tabs ------*/}
            <ColumnTabs task={task} columns={columns} onColumnsChange={showColumns} className="mt-5" />
          </>
        )}
      </SheetHeader>

      {archived ? (
        <p className="p-6">{m.task_archived_notice()}</p>
      ) : (
        // Each column scrolls on its own, so the thread stays in view while a field is worked on. Keyed by the columns
        // shown, so switching one on or off lays the group out afresh from the sizes below.
        <ResizablePanelGroup key={columns.join()} className="min-h-0 flex-1">
          {/*------ Work ------*/}
          {columns.includes("work") && (
            // Never narrower than the comment editor's toolbar, which doesn't wrap.
            <ResizablePanel id="work" defaultSize={sizes.work} minSize={440}>
              <DrawerColumn label={m.task_column_work()} entering={entering.includes("work")} className="gap-8">
                <TaskDescriptionField task={task} update={update} readOnly={readOnly} />
                <Separator variant="perforated" className="-mx-6" />
                <TaskChecklist task={task} projectId={project.id} people={people} readOnly={readOnly} />
                <Separator variant="perforated" className="-mx-6" />
                <TaskAttachments
                  task={task}
                  projectId={project.id}
                  people={people}
                  uploads={uploads}
                  readOnly={readOnly}
                />
                <Separator variant="perforated" className="-mx-6" />
                {/* Last, so the thread grows down the column with its editor under it. */}
                <TaskComments task={task} project={project} viewerId={viewerId} readOnly={readOnly} />
              </DrawerColumn>
            </ResizablePanel>
          )}
          {columns.includes("work") && columns.length > 1 && <ResizableHandle withHandle />}

          {/*------ Tracking ------*/}
          {/* Never narrower than a dependency's row with its code, title and keys. */}
          {columns.includes("tracking") && (
            <ResizablePanel id="tracking" defaultSize={sizes.tracking} minSize={360}>
              <DrawerColumn label={m.task_column_tracking()} entering={entering.includes("tracking")} className="gap-8">
                <TaskTimeSection task={task} project={project} />
                <Separator variant="perforated" className="-mx-6" />
                <TaskDependencies task={task} project={project} board={board} kinds={kinds} readOnly={readOnly} />
                <Separator variant="perforated" className="-mx-6" />
                <TaskHistory task={task} project={project} people={people} />
              </DrawerColumn>
            </ResizablePanel>
          )}
          {columns.includes("tracking") && columns.includes("details") && <ResizableHandle withHandle />}

          {/*------ Details ------*/}
          {/* Opens narrow beside the others and grows as far as their own minimums allow. */}
          {columns.includes("details") && (
            <ResizablePanel id="details" defaultSize={sizes.details} minSize={320}>
              <DrawerColumn label={m.task_column_details()} entering={entering.includes("details")} className="gap-5">
                <PriorityField task={task} update={update} readOnly={readOnly} />
                <AssigneesField
                  task={task}
                  update={update}
                  members={project.members}
                  people={people}
                  canEdit={canEdit}
                />
                <OwnerField
                  task={task}
                  update={update}
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
                <Separator variant="perforated" className="-mx-6" />
                <LabelPicker
                  task={task}
                  update={update}
                  projectId={project.id}
                  labels={board.labels}
                  tasks={board.tasks}
                  isAdmin={isAdmin}
                  readOnly={readOnly}
                />
                <Separator variant="perforated" className="-mx-6" />
                <TaskDelegation task={task} project={project} code={code} readOnly={readOnly} />
                <Separator variant="perforated" className="-mx-6" />
                <TaskWatchers task={task} projectId={project.id} viewerId={viewerId} />
                {isAdmin && (
                  <>
                    <Separator variant="perforated" className="-mx-6" />
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
                    <Separator variant="perforated" className="-mx-6" />
                    <ArchiveTaskButton projectId={project.id} task={task} code={code} onArchived={onArchived} />
                  </>
                )}
              </DrawerColumn>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      )}
    </div>
  );
}

/*===== Columns =====*/

type DrawerColumnKey = "work" | "tracking" | "details";

const COLUMN_KEYS: DrawerColumnKey[] = ["work", "tracking", "details"];

// The panel's width for one, two or three columns: one reads like a page and leaves the status track its row, two
// give the tracking column room beside the work, three take the whole page. Never wider than the page, whatever is
// asked (`sheet.styles.ts`).
const SHEET_WIDTHS: Record<number, string | undefined> = { 1: "64rem", 2: "80rem", 3: undefined };

// Each column's share when all three show; a smaller set splits the width in the same proportions. The work column is
// the widest: it holds the task and its thread.
const COLUMN_WEIGHTS: Record<DrawerColumnKey, number> = { work: 46, tracking: 30, details: 24 };

/** The default size of each shown column, as a percentage of the drawer's width. */
function columnSizes(columns: DrawerColumnKey[]): Record<DrawerColumnKey, string> {
  const total = columns.reduce((sum, key) => sum + COLUMN_WEIGHTS[key], 0);
  const size = (key: DrawerColumnKey) => `${(COLUMN_WEIGHTS[key] / total) * 100}%`;
  return { work: size("work"), tracking: size("tracking"), details: size("details") };
}

/*===== Column Tabs =====*/

const COLUMN_TABS: Record<DrawerColumnKey, { label: () => string; icon: LucideIcon }> = {
  work: { label: m.task_column_work, icon: FileTextIcon },
  tracking: { label: m.task_column_tracking, icon: ActivityIcon },
  details: { label: m.task_column_details, icon: SlidersHorizontalIcon },
};

/**
 * The folder tabs at the foot of the header that switch the drawer's columns on and off, in the columns' own order. An
 * open tab joins its column; each prints what it holds, so a closed one still says something: the checklist's
 * progress, how old the task is, the people on it. The summaries are print only: each column
 * says the same in full. One always stays open: pressing the last open tab again does nothing.
 */
function ColumnTabs({
  task,
  columns,
  onColumnsChange,
  className,
}: {
  task: TaskDetail;
  columns: DrawerColumnKey[];
  onColumnsChange: (columns: DrawerColumnKey[]) => void;
  /** Layout only. */
  className?: string;
}) {
  const done = task.checklist.filter((item) => item.doneAt !== null).length;
  const summaries: Record<DrawerColumnKey, ReactNode> = {
    work:
      task.checklist.length > 0 ? (
        <Marking variant="reading">{`${formatNumber(done)}/${formatNumber(task.checklist.length)}`}</Marking>
      ) : null,
    tracking: <TaskAge task={task} />,
    details:
      task.assigneeIds.length > 0 ? (
        <span className="flex items-center gap-1">
          <UsersIcon className="size-3.5" />
          <Marking variant="reading">{formatNumber(task.assigneeIds.length)}</Marking>
        </span>
      ) : null,
  };

  return (
    <ToggleGroup
      multiple
      variant="tab"
      size="md"
      spacing={1}
      aria-label={m.task_columns()}
      value={columns}
      onValueChange={(value) => {
        const next = COLUMN_KEYS.filter((key) => (value as string[]).includes(key));
        if (next.length > 0) onColumnsChange(next);
      }}
      className={className}
    >
      {COLUMN_KEYS.map((key) => {
        const { label, icon: Icon } = COLUMN_TABS[key];
        return (
          <ToggleGroupItem key={key} value={key}>
            <Icon aria-hidden="true" />
            {label()}
            {summaries[key] && (
              <span aria-hidden="true" className="ms-1 flex items-center">
                {summaries[key]}
              </span>
            )}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

/** How old the task is, for its tab: created to done, or to now (nothing while the page hydrates). */
function TaskAge({ task }: { task: TaskDetail }) {
  const now = useNow();
  const end = task.completedAt?.getTime() ?? now;
  if (end === null) return null;
  return <Marking variant="reading">{formatSpan(secondsBetween(task.createdAt, end))}</Marking>;
}

/*===== Column =====*/

/**
 * One of the drawer's columns, scrolling on its own: a region named for screen readers (its tab names it on screen).
 * Each column is an old ticket seated in a tray, the way the board's cards sit in theirs: a rounded leaf with its
 * sections parted by tear lines, whose notches bite into the ticket's sides and show the tray under it.
 */
function DrawerColumn({
  label,
  entering = false,
  className,
  children,
}: {
  label: string;
  /** Just switched on: fades in while the panel widens to make room. */
  entering?: boolean;
  /** Spacing between the column's parts. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "h-full overflow-y-auto bg-tray p-4 shadow-tray",
        entering && "duration-250 motion-safe:animate-in motion-safe:fade-in-0",
      )}
    >
      {/*------ Ticket ------*/}
      {/* At least the column's height, so a short one is still a whole ticket; clipped, so the tear lines' notches show
          as half circles bitten out of its sides. */}
      <div className="min-h-full overflow-hidden rounded-card bg-leaf p-6 shadow-sm">
        {/* A column alone spans the whole drawer; its sections keep a reading width in the middle of it, while the
            tear lines between them run from side to side. */}
        <div
          className={cn(
            "flex flex-col [&>:not([data-slot=separator])]:mx-auto [&>:not([data-slot=separator])]:w-full [&>:not([data-slot=separator])]:max-w-4xl",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/*===== History =====*/

/** The task's history, newest first; fetched when the tracking column first shows. */
function TaskHistory({ task, project, people }: { task: TaskDetail; project: Project; people: Map<string, Person> }) {
  const { data: items } = useQuery(
    orpc.activity.forTask.queryOptions({ input: { projectId: project.id, taskId: task.id } }),
  );

  return (
    <section aria-labelledby="task-history-title" className="flex flex-col gap-4">
      <h3 id="task-history-title" className="flex items-center gap-2 font-heading text-h4">
        <HistoryIcon aria-hidden="true" className="size-4" />
        {m.task_history_title()}
      </h3>
      {items ? (
        <ActivityFeed items={items} people={people} dayHeading="h4" />
      ) : (
        <Spinner aria-label={m.common_loading()} />
      )}
    </section>
  );
}
