import { Link } from "@tanstack/react-router";
import { AlignStartVerticalIcon, LockIcon } from "lucide-react";
import type { PointerEventHandler, ReactNode } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { useNow } from "#/hooks/use-now";
import { formatDuration, liveSeconds } from "#/lib/duration";
import { DueMark } from "#/components/shared/due-mark/due-mark";
import { formatList } from "#/lib/locale";
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

/*===== Task Card =====*/

/**
 * A card on the board, as a small housing module (the approved design, docs/frontend/reference/…/task-card.tsx): the
 * code and priority on a printed strip, the title and labels on the face, people and dates on the footer. The title is
 * the link that opens the card's drawer; its hit area covers the whole card. The owner's cap shows beside the
 * assignee's only when they differ, since delegation never changes the owner. The time spent prints on the footer once
 * there is some, beside a blinking LED while someone's timer runs on it. A blocked card gets a yellow strip naming what
 * it waits for, so the dependency shows without opening it.
 *
 * On the board the card is also something to pick up (`SortableTaskCard` passes the drag props): `grip` and `menu` sit
 * on the header strip, above the stretched link. `state` dims the card left behind while
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
}) {
  const code = taskCode({ key: projectKey, number: task.number });
  const owner = people.get(task.ownerId);
  const assignee = task.assigneeId ? people.get(task.assigneeId) : undefined;
  const taskLabels = task.labelIds.map((id) => labels.get(id)).filter((label) => label !== undefined);

  return (
    <article
      onPointerDown={onPointerDown}
      inert={state === "overlay" || undefined}
      className={cn(
        "group/card relative flex flex-col rounded-housing border border-border bg-card shadow-housing transition-colors duration-150 select-none",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-accent",
        state === "placeholder" && "opacity-40",
        state === "overlay" && "cursor-grabbing bg-accent",
      )}
    >
      {/*------ Header Strip ------*/}
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="flex items-center gap-2">
          {grip && <span className="relative z-10 flex">{grip}</span>}
          <Marking variant="code">{code}</Marking>
        </span>
        <span className="flex items-center gap-2">
          <PriorityMark priority={task.priority} />
          {menu && <span className="relative z-10 flex">{menu}</span>}
        </span>
      </header>

      {/*------ Face ------*/}
      <div className="flex flex-col gap-3 p-3">
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
      <footer className="flex min-h-11 items-center justify-between gap-3 px-3 pb-2.5">
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
        <span className="flex items-center gap-3">
          <SpentReadout task={task} />
          {task.hasDescription && (
            <AlignStartVerticalIcon aria-label={m.task_has_description()} className="size-3.5 text-muted-foreground" />
          )}
          {task.dueDate && <DueMark dueDate={task.dueDate} finished={stopped || task.completedAt !== null} />}
        </span>
      </footer>
    </article>
  );
}
