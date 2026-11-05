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

import { AvatarGroup, AvatarGroupCount } from "#/components/primitive/avatar/avatar";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/primitive/tooltip/tooltip";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { DueMark } from "#/components/shared/due-mark/due-mark";
import { formatList, formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Label, TaskCard as TaskCardData } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { PriorityMark } from "#/routes/projects_projectKey/components/priority-mark";

/*===== Count Badge =====*/

/**
 * A small count on the footer: an icon in the housing's muted ink and the number in full ink beside it, read out as
 * `label`. `complete` lights a green LED beside it (a green text would be too faint on the card).
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
    <span className="flex items-center gap-1">
      {complete && <Led signal="positive" state="on" size="sm" />}
      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="sr-only">{label}</span>
      <Marking variant="reading" aria-hidden="true">
        {value}
      </Marking>
    </span>
  );
}

/*===== Spine =====*/

/** The most slots the spine holds: past it, the last slot counts the rest, so a short card keeps its height. */
const SPINE_SLOTS = 3;

/**
 * The tray down the card's starting edge that holds its people, top to bottom: the owner's graphite cap, then the
 * other assignees, then a count of the rest. The maker of a task is assigned from the start (docs/app.md rule 2), so the
 * owner is usually one of the assignees and leads them; an owner who isn't (they handed the work on) stands apart
 * behind a rule. Nobody assigned leaves an empty seat. Without `tooltips` (a card being dragged) the caps name no one
 * on pointing.
 */
function CardSpine({
  task,
  people,
  tooltips,
  plated,
}: {
  task: TaskCardData;
  people: Map<string, Person>;
  tooltips: boolean;
  /** A plate takes the corner under the tray, so the tray stops at the footer's line. */
  plated: boolean;
}) {
  const crew = task.assigneeIds.filter((id) => id !== task.ownerId).flatMap((id) => people.get(id) ?? []);
  const owner = people.get(task.ownerId);
  const ownerAssigned = task.assigneeIds.includes(task.ownerId);
  // An owner who doesn't do the work shows only beside someone who does.
  const ownerShown = owner !== undefined && (ownerAssigned || crew.length > 0);
  const shown = crew.length > SPINE_SLOTS ? crew.slice(0, SPINE_SLOTS - 1) : crew;
  const hidden = crew.slice(shown.length);
  const names = formatList(hidden.map((person) => person.name));
  const count = (
    <AvatarGroupCount>
      <span aria-hidden="true" dir="ltr">
        +{formatNumber(hidden.length)}
      </span>
      <span className="sr-only">{names}</span>
    </AvatarGroupCount>
  );

  return (
    <div
      className={cn(
        "flex w-9.5 shrink-0 flex-col items-center border-e border-border/60 bg-tray py-3",
        plated ? "col-start-1 row-start-1 rounded-ss-card" : "rounded-s-card",
      )}
    >
      {!ownerShown && crew.length === 0 ? (
        // An empty cut where a cap would sit.
        <span className="size-6 rounded-chassis-compact bg-cut opacity-55 shadow-cut">
          <span className="sr-only">{m.task_unassigned()}</span>
        </span>
      ) : (
        // Raised over the title link's stretched ::after, which covers the card, so pointing at a cap reaches it and
        // shows the person's name.
        <AvatarGroup orientation="vertical" className="relative z-10">
          {ownerShown && (
            <>
              <PersonAvatar name={owner.name} src={owner.avatarUrl} owner tooltip={tooltips} />
              {!ownerAssigned && <span aria-hidden="true" className="h-px w-4 bg-border" />}
            </>
          )}
          {shown.map((person) => (
            <PersonAvatar key={person.id} name={person.name} src={person.avatarUrl} tooltip={tooltips} />
          ))}
          {hidden.length > 0 &&
            (tooltips ? (
              <Tooltip>
                <TooltipTrigger render={count} />
                <TooltipContent aria-hidden="true">{names}</TooltipContent>
              </Tooltip>
            ) : (
              count
            ))}
        </AvatarGroup>
      )}
    </div>
  );
}

/*===== Footer Cell =====*/

/**
 * One value on the footer's readout row. The row rules a line between neighbouring cells, the full height of the
 * footer, so each cell holds its own padding.
 */
function FooterCell({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-1 px-1.5 py-1.5 first:ps-0 last:pe-0">{children}</span>;
}

/*===== Task Card =====*/

/** Handles on a card that wait out of sight until the card is pointed at or focused, and never hide on touch. */
const PARTS_ON_HOVER =
  "opacity-0 transition-opacity group-focus-within/task-card:opacity-100 group-hover/task-card:opacity-100 pointer-coarse:opacity-100";

/**
 * A card on the board, as a small housing module (the approved design, docs/frontend/reference/…/task-card.tsx): its
 * people in a tray down the starting edge (`CardSpine`), the priority LEDs set into its top edge, the code on a
 * printed strip, the title and labels on the face, readouts and dates on the footer. The title is the link that opens
 * the card's drawer; its hit area covers the whole card. A blocked card gets a yellow strip naming what it waits for,
 * so the dependency shows without opening it. A card where work is under way carries the ping key on a `plate` in the
 * corner under its tray.
 *
 * On the board the card is also something to pick up (`SortableTaskCard` passes the drag props): `grip` and `menu` sit
 * on the code line, above the stretched link, and show while the card is pointed at or focused. `state` dims the card left behind while
 * its copy is dragged (`placeholder`) and makes that copy inert (`overlay`). Neither has tooltips: nobody can point at
 * them, and the placeholder re-mounts each time it crosses into another column, where each popup would set up its
 * store and re-render again on the way out.

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
  plate,
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
  /**
   * What fills the corner under the tray. It takes the footer's row, so it is as tall as the footer and its top is the
   * footer's line, whatever the footer holds; a card with one always has a footer.
   */
  plate?: ReactNode;
}) {
  const code = taskCode({ key: projectKey, number: task.number });
  const taskLabels = task.labelIds.map((id) => labels.get(id)).filter((label) => label !== undefined);
  const { comments, attachments, checklistDone, checklistTotal } = task.counts;
  const hasReadouts =
    !!plate ||
    comments > 0 ||
    attachments > 0 ||
    checklistTotal > 0 ||
    task.hasDescription ||
    watching ||
    task.dueDate !== null;
  const blocked = blockedBy.length > 0;

  return (
    <article
      onPointerDown={onPointerDown}
      inert={state === "overlay" || undefined}
      className={cn(
        "group/task-card relative rounded-card border border-border bg-card surface-grain shadow-housing transition-colors duration-150 select-none",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-accent",
        plate ? "grid grid-cols-card-plated grid-rows-card-plated" : "flex",
        state === "placeholder" && "opacity-40",
        state === "overlay" && "cursor-grabbing bg-accent",
      )}
    >
      <PriorityMark priority={task.priority} />
      <CardSpine task={task} people={people} tooltips={state === "idle"} plated={!!plate} />
      {/* The footer's line is the footer's own top border, or the strip's lower border one pixel above the footer. It
          runs a pixel over the card's border, so the black meets the outline and no line of tray shows round it. */}
      {plate && <div className={cn("col-start-1 row-start-2 -ms-px -mb-px flex", blocked && "-mt-px")}>{plate}</div>}
      {/* With a plate the card is a grid, and the face and footer take its cells directly. */}
      <div className={plate ? "contents" : "flex min-w-0 flex-1 flex-col"}>
        <div className={cn("flex min-w-0 flex-col", plate && "col-start-2 row-start-1")}>
          {/*------ Code Line ------*/}
          {/* The grip and menu print only while the pointer is over the card or focus is inside it (always on a touch
            screen): on a board of cards they would otherwise be a column of handles. */}
          {/* The end padding keeps the grip and menu clear of the priority LEDs, which hang into this corner. */}
          <header className="flex min-h-9 items-center justify-between gap-2 ps-3 pe-14 pt-1.5">
            <Marking variant="code">{code}</Marking>
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
          {/* The signal yellow washes out on the light housing, so light mode prints the strip in the attention ink. */}
          {blocked && (
            <p className="mt-auto flex items-center gap-2 border-y border-warning bg-warning-surface px-3 py-1.5 text-caption text-warning dark:border-signal-attention dark:bg-signal-attention/15 dark:text-foreground">
              <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">{m.dependency_blocked_label({ blockers: formatList(blockedBy) })}</span>
              <span aria-hidden="true">{m.dependency_waits_for()}</span>
              <Marking variant="code" aria-hidden="true">
                {blockedBy.join(" ")}
              </Marking>
            </p>
          )}
        </div>

        {/*------ Footer ------*/}
        {/* The blocked strip brings its own rule. A card with nothing to read out has no footer. */}
        {hasReadouts && (
          <footer
            className={cn(
              "flex min-h-11 items-stretch justify-end border-border/60 px-3",
              !blocked && "border-t",
              plate && "col-start-2 row-start-2",
            )}
          >
            {/* Values sit in cells with a printed rule between them, top to bottom like the readouts on a panel, so "۶"
            and "۰/۲" never run together. The flags (has a description, watched) share one cell. */}
            <span className="flex flex-wrap justify-end divide-x divide-border/60">
              {comments > 0 && (
                <FooterCell>
                  <CountBadge
                    icon={MessageSquareIcon}
                    label={m.card_comment_count({ count: comments })}
                    value={formatNumber(comments)}
                  />
                </FooterCell>
              )}
              {attachments > 0 && (
                <FooterCell>
                  <CountBadge
                    icon={PaperclipIcon}
                    label={m.card_attachment_count({ count: attachments })}
                    value={formatNumber(attachments)}
                  />
                </FooterCell>
              )}
              {checklistTotal > 0 && (
                <FooterCell>
                  <CountBadge
                    icon={ListChecksIcon}
                    label={m.card_checklist_count({ done: checklistDone, total: checklistTotal })}
                    value={`${formatNumber(checklistDone)}/${formatNumber(checklistTotal)}`}
                    complete={checklistDone === checklistTotal}
                  />
                </FooterCell>
              )}
              {(task.hasDescription || watching) && (
                <FooterCell>
                  {task.hasDescription && (
                    <AlignStartVerticalIcon
                      aria-label={m.task_has_description()}
                      className="size-4 text-muted-foreground"
                    />
                  )}
                  {watching && (
                    <EyeIcon aria-label={m.watcher_card_watching()} className="size-4 text-muted-foreground" />
                  )}
                </FooterCell>
              )}
              {task.dueDate && (
                <FooterCell>
                  <DueMark dueDate={task.dueDate} finished={stopped || task.completedAt !== null} brief />
                </FooterCell>
              )}
            </span>
          </footer>
        )}
      </div>
    </article>
  );
}
