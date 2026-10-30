import { Link } from "@tanstack/react-router";
import {
  AlignStartVerticalIcon,
  EyeIcon,
  ListChecksIcon,
  LockIcon,
  MessageSquareIcon,
  PaperclipIcon,
  type LucideIcon,
} from "lucide-react";
import type { PointerEventHandler, ReactNode } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { useNow } from "#/hooks/use-now";
import { formatDuration, liveSeconds } from "#/lib/duration";
import { DueMark } from "#/components/shared/due-mark/due-mark";
import { formatList, formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Label, TaskCard as TaskCardData } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { PriorityMark } from "#/routes/projects_projectKey/components/priority-mark";

/*===== Time Spent =====*/

/** The card's time spent as `h:mm`, the sum of its logs. Nothing until some time is logged. */
function SpentReadout({ task }: { task: TaskCardData }) {
  if (task.runningSince.length > 0) return <RunningReadout task={task} />;
  if (task.spentSeconds < 60) return null;
  return <SpentMarking seconds={task.spentSeconds} />;
}

/** While a timer runs: a blinking green LED and the total, ticking. */
function RunningReadout({ task }: { task: TaskCardData }) {
  const now = useNow();
  return (
    <span className="flex items-center gap-1.5">
      <Led signal="positive" state="blink" size="sm" label={m.task_run_running()} />
      <SpentMarking seconds={liveSeconds({ ...task, now })} />
    </span>
  );
}

function SpentMarking({ seconds }: { seconds: number }) {
  return (
    <Marking variant="code">
      <span className="sr-only">{m.time_spent_label()}: </span>
      {formatDuration(Math.floor(seconds / 60))}
    </Marking>
  );
}

/*===== Count Badge =====*/

/**
 * A small count on the footer: an icon and a number, read out as `label`. `complete` lights a green LED beside it (a
 * green text would be too faint on the card).
 */
function CountBadge({
  icon: Icon,
  label,
  value,
  complete = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  complete?: boolean;
}) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {complete && <Led signal="positive" state="on" size="sm" />}
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{label}</span>
      <Marking variant="code" aria-hidden="true">
        {value}
      </Marking>
    </span>
  );
}

/*===== Task Card =====*/

/** Handles on a card that wait out of sight until the card is pointed at or focused, and never hide on touch. */
const PARTS_ON_HOVER =
  "opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100";

/**
 * A card on the board, as a small housing module (the approved design, docs/frontend/reference/…/task-card.tsx): the
 * code and priority on a printed strip, the title and labels on the face, people and dates on the footer. The title is
 * the link that opens the card's drawer; its hit area covers the whole card. The owner's cap shows beside the
 * assignee's only when they differ, since delegation never changes the owner. The time spent prints on the footer once
 * there is some, beside a blinking LED while someone's timer runs on it. A blocked card gets a yellow strip naming what
 * it waits for, so the dependency shows without opening it.
 *
 * On the board the card is also something to pick up (`SortableTaskCard` passes the drag props): `grip` and `menu` sit
 * on the code line, above the stretched link, and show while the card is pointed at or focused. `state` dims the card left behind while
 * its copy is dragged (`placeholder`) and makes that copy inert (`overlay`).
 */
export function TaskCard({
  task,
  projectKey,
  labels,
  people,
  blockedBy = [],
  onPointerDown,
  grip,
  menu,
  state = "idle",
  stopped = false,
  watching = false,
}: {
  task: TaskCardData;
  projectKey: string;
  labels: Map<string, Label>;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up; the card prints them on a warning strip. */
  blockedBy?: string[];
  /** Starts a pointer drag anywhere on the card; the keyboard drag lives on `grip`. */
  onPointerDown?: PointerEventHandler<HTMLElement>;
  grip?: ReactNode;
  menu?: ReactNode;
  state?: "idle" | "placeholder" | "overlay";
  /** In the cancelled column: like a done card, its due date no longer warns. */
  stopped?: boolean;
  /** The viewer watches it: an eye on the footer. */
  watching?: boolean;
}) {
  const code = taskCode({ key: projectKey, number: task.number });
  const owner = people.get(task.ownerId);
  const assignee = task.assigneeId ? people.get(task.assigneeId) : undefined;
  const taskLabels = task.labelIds.map((id) => labels.get(id)).filter((label) => label !== undefined);
  const { comments, attachments, checklistDone, checklistTotal } = task.counts;

  return (
    <article
      onPointerDown={onPointerDown}
      inert={state === "overlay" || undefined}
      className={cn(
        "group/card relative flex flex-col rounded-housing border border-border bg-card surface-grain shadow-housing transition-colors duration-150 select-none",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-accent",
        state === "placeholder" && "opacity-40",
        state === "overlay" && "cursor-grabbing bg-accent",
      )}
    >
      {/*------ Code Line ------*/}
      {/* The grip and menu print only while the pointer is over the card or focus is inside it (always on a touch
          screen): on a board of cards they would otherwise be a column of handles. */}
      <header className="flex min-h-9 items-center justify-between gap-2 ps-3 pe-1.5 pt-1.5">
        <span className="flex items-center gap-2.5">
          <Marking variant="code">{code}</Marking>
          <PriorityMark priority={task.priority} />
        </span>
        <span className={cn("relative z-10 flex items-center gap-0.5", PARTS_ON_HOVER)}>
          {grip}
          {menu}
        </span>
      </header>

      {/*------ Face ------*/}
      <div className="flex flex-col gap-2.5 px-3 pt-1 pb-3">
        <h3 className="text-body leading-6 font-semibold">
          {/* The link's ::after stretches over the card, so the whole card opens the drawer. */}
          <Link
            from="/projects/$projectKey"
            search={(previous) => ({ ...previous, task: code })}
            // A link is natively draggable, which would steal the pointer from the card's own drag.
            draggable={false}
            className="outline-none after:absolute after:inset-0"
          >
            {task.title}
          </Link>
        </h3>
        {taskLabels.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={m.task_labels()}>
            {taskLabels.map((label) => (
              <li key={label.id}>
                <LabelTag label={label} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*------ Blocked Strip ------*/}
      {blockedBy.length > 0 && (
        <p className="flex items-center gap-2 border-y border-signal-attention/60 bg-signal-attention/15 px-3 py-1.5 text-caption">
          <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">{m.dependency_blocked_label({ blockers: formatList(blockedBy) })}</span>
          <span aria-hidden="true">{m.dependency_waits_for()}</span>
          <Marking variant="code" aria-hidden="true">
            {blockedBy.join(" ")}
          </Marking>
        </p>
      )}

      {/*------ Footer ------*/}
      {/* The blocked strip brings its own rule. */}
      <footer
        className={cn(
          "flex min-h-11 items-center justify-between gap-3 border-border/60 px-3 py-1.5",
          blockedBy.length === 0 && "border-t",
        )}
      >
        <span className="flex items-center gap-2">
          {owner && assignee && owner.id !== assignee.id && (
            <PersonAvatar name={owner.name} src={owner.avatarUrl} owner />
          )}
          {assignee ? (
            <PersonAvatar name={assignee.name} src={assignee.avatarUrl} />
          ) : (
            <Marking>{m.task_unassigned()}</Marking>
          )}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {comments > 0 && (
            <CountBadge
              icon={MessageSquareIcon}
              label={m.card_comment_count({ count: comments })}
              value={formatNumber(comments)}
            />
          )}
          {attachments > 0 && (
            <CountBadge
              icon={PaperclipIcon}
              label={m.card_attachment_count({ count: attachments })}
              value={formatNumber(attachments)}
            />
          )}
          {checklistTotal > 0 && (
            <CountBadge
              icon={ListChecksIcon}
              label={m.card_checklist_count({ done: checklistDone, total: checklistTotal })}
              value={`${formatNumber(checklistDone)}/${formatNumber(checklistTotal)}`}
              complete={checklistDone === checklistTotal}
            />
          )}
          <SpentReadout task={task} />
          {task.hasDescription && (
            <AlignStartVerticalIcon aria-label={m.task_has_description()} className="size-3.5 text-muted-foreground" />
          )}
          {watching && <EyeIcon aria-label={m.watcher_card_watching()} className="size-3.5 text-muted-foreground" />}
          {task.dueDate && <DueMark dueDate={task.dueDate} finished={stopped || task.completedAt !== null} />}
        </span>
      </footer>
    </article>
  );
}
