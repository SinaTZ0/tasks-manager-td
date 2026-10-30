import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragStartEvent } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { toast } from "#/components/primitive/toast/toast";
import { dueState } from "#/components/shared/due-mark/due-mark";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate, isoToDate } from "#/lib/locale";
import { addDays } from "#/lib/team-day";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import { taskCode } from "#/orpc/task/constants";
import type { Board, TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";
import { boardQuery } from "#/routes/projects_projectKey/queries";
import { A_SATURDAY, type Month } from "#/routes/projects_projectKey_calendar/month";

/*===== Due Date Change =====*/

/**
 * Moves a card to another day: an ordinary `task.update` of its due date, so it has its history entry and reaches
 * other pages live. Shown at once on the calendar; a failure puts it back.
 */
function useDueDateChange(projectId: string) {
  const queryClient = useQueryClient();
  const key = boardQuery(projectId).queryKey;
  return useMutation(
    orpc.task.update.mutationOptions({
      onMutate: async ({ taskId, dueDate }) => {
        await queryClient.cancelQueries({ queryKey: key });
        const before = queryClient.getQueryData(key);
        queryClient.setQueryData(
          key,
          (board: Board | undefined) =>
            board && {
              ...board,
              tasks: board.tasks.map((task) => (task.id === taskId ? { ...task, dueDate: dueDate ?? null } : task)),
            },
        );
        return { before };
      },
      onError: (error, _input, context) => {
        if (context?.before) queryClient.setQueryData(key, context.before);
        const failure = describeApiFailure({ error, fallback: m.calendar_move_failed() });
        toast.add({ title: failure.message ?? m.calendar_move_failed(), type: "error" });
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
        ]),
    }),
  );
}

/*===== Card Chip =====*/

const chipId = (taskId: string) => `calendar-card-${taskId}`;

/**
 * A card on its day: its due warning (the board's colours), code and title, opening its drawer. An editor picks it
 * up to drop it on another day, or moves it with the arrow keys: a day either way along the week, a week up or down.
 */
function CardChip({
  task,
  code,
  finished,
  movable,
  overlay = false,
  onShift,
}: {
  task: TaskCard;
  code: string;
  /** Done: its due date no longer warns. */
  finished: boolean;
  movable: boolean;
  overlay?: boolean;
  onShift?: (days: number) => void;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: task.id, disabled: !movable || overlay });
  const { tone } = dueState({ dueDate: task.dueDate ?? "", finished });
  // In right-to-left days run leftwards, so the arrow that points at the next day is the left one.
  const forward = getLocale() === "fa" ? "ArrowLeft" : "ArrowRight";
  const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";

  const onKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (!movable || !onShift || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const days = { [forward]: 1, [backward]: -1, ArrowDown: 7, ArrowUp: -7 }[event.key];
    if (!days) return;
    event.preventDefault();
    onShift(days);
  };

  return (
    <Link
      ref={overlay ? undefined : setNodeRef}
      id={overlay ? undefined : chipId(task.id)}
      from="/projects/$projectKey/calendar"
      search={(previous) => ({ ...previous, task: code })}
      // A link is natively draggable, which would steal the pointer from the chip's own drag.
      draggable={false}
      onKeyDown={onKeyDown}
      onPointerDown={
        movable && !overlay
          ? (listeners?.onPointerDown as PointerEventHandler<HTMLAnchorElement> | undefined)
          : undefined
      }
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-chassis border border-border bg-card px-2 py-1 text-caption shadow-housing outline-none select-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        isDragging && "opacity-40",
        overlay && "cursor-grabbing bg-accent",
      )}
    >
      {tone && (
        <Led
          signal={tone === "late" ? "action" : "attention"}
          state="on"
          size="sm"
          label={tone === "late" ? m.calendar_late() : m.calendar_due_soon()}
        />
      )}
      <Marking variant="code" className="shrink-0">
        {code}
      </Marking>
      <span className="truncate">{task.title}</span>
    </Link>
  );
}

/*===== Day =====*/

/** The day under a point of the screen: the cell carries its date in `data-day`. */
const dayAt = ({ x, y }: { x: number; y: number }) =>
  document
    .elementsFromPoint(x, y)
    .map((element) => (element instanceof HTMLElement ? element.dataset.day : undefined))
    .find(Boolean);

function DayCell({
  date,
  today,
  isOver,
  children,
}: {
  date: string;
  today: string;
  /** A card is being dragged over it. */
  isOver: boolean;
  children: ReactNode;
}) {
  const isToday = date === today;
  const day = isoToDate(date);

  return (
    <li
      data-day={date}
      className={cn(
        "flex min-h-28 min-w-0 flex-col gap-1.5 bg-card p-2 transition-colors",
        isOver && "bg-accent",
        isToday && "outline-2 -outline-offset-2 outline-ring",
      )}
    >
      <span className="flex items-center gap-1.5">
        {isToday && <Led signal="positive" state="on" size="sm" label={m.calendar_today()} />}
        <time dateTime={date} className={cn("text-caption font-semibold", !isToday && "text-muted-foreground")}>
          <span aria-hidden="true">{formatDate(day, { day: "numeric" })}</span>
          <span className="sr-only">{formatDate(day, { dateStyle: "full" })}</span>
        </time>
      </span>
      {children}
    </li>
  );
}

/*===== Month Grid =====*/

/**
 * A month of the project's cards on their due days (docs/task-manager-plan.md → slice 21): seven columns, Saturday to
 * Friday, the reader's calendar. Editors drag a card to another day or move it with the arrow keys; a move past the
 * month's edge turns the page to the month it landed in (`onMonthChange`).
 */
export function MonthGrid({
  month,
  today,
  tasks,
  projectId,
  projectKey,
  isFinished,
  canEdit,
  onMonthChange,
}: {
  month: Month;
  today: string;
  /** The cards to place, already filtered; those without a due date are left out here. */
  tasks: TaskCard[];
  projectId: string;
  projectKey: string;
  isFinished: (task: TaskCard) => boolean;
  canEdit: boolean;
  onMonthChange: (date: string) => void;
}) {
  const instructionsId = useId();
  const change = useDueDateChange(projectId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  // The card being dragged, where the pointer is, and the day under it. dnd-kit only picks the card up: the day is read
  // from the pointer itself, which its measuring got wrong once the page was scrolled.
  const [drag, setDrag] = useState<{ task: TaskCard; x: number; y: number; over: string | undefined } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The card the keyboard moved: focused again once it is drawn on its new day (it re-mounts there).
  const refocus = useRef<{ taskId: string; date: string } | null>(null);

  const byDay = new Map<string, TaskCard[]>();
  for (const task of tasks) {
    if (task.dueDate) byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task]);
  }
  const codeOf = (task: TaskCard) => taskCode({ key: projectKey, number: task.number });

  // After every render, until the card is drawn on its new day: renders come before the optimistic update (or the
  // month change) lands, and the chip still on its old day is about to unmount.
  useEffect(() => {
    if (!refocus.current) return;
    const chip = document.getElementById(chipId(refocus.current.taskId));
    if (chip?.closest("li")?.querySelector("time")?.getAttribute("dateTime") === refocus.current.date) {
      chip.focus();
      refocus.current = null;
    }
  });

  const moveTo = ({ task, date }: { task: TaskCard; date: string }) => {
    if (date === task.dueDate) return;
    change.mutate({ projectId, taskId: task.id, dueDate: date });
    setAnnouncement(m.calendar_moved({ code: codeOf(task), date: formatDate(isoToDate(date), { dateStyle: "long" }) }));
  };

  // Follows the pointer while a card is dragged; dropping reads the day under it.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const follow = (event: PointerEvent) =>
      setDrag(
        (current) =>
          current && {
            ...current,
            x: event.clientX,
            y: event.clientY,
            over: dayAt({ x: event.clientX, y: event.clientY }),
          },
      );
    window.addEventListener("pointermove", follow);
    return () => window.removeEventListener("pointermove", follow);
  }, [dragging]);

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const task = tasks.find((item) => item.id === active.id);
    const { clientX: x, clientY: y } = activatorEvent as PointerEvent;
    if (task) setDrag({ task, x, y, over: dayAt({ x, y }) });
  };

  const onDragEnd = () => {
    if (drag?.over) moveTo({ task: drag.task, date: drag.over });
    setDrag(null);
  };

  const weekdays = Array.from({ length: 7 }, (_, index) =>
    formatDate(isoToDate(addDays({ date: A_SATURDAY, days: index })), { weekday: "short" }),
  );
  const trailing = (7 - ((month.leading + month.days.length) % 7)) % 7;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDrag(null)}>
      {canEdit && (
        <p id={instructionsId} className="text-caption text-muted-foreground">
          {m.calendar_instructions()}
        </p>
      )}
      <div className="overflow-hidden rounded-housing border border-border shadow-housing">
        <ol aria-hidden="true" className="grid grid-cols-7 gap-px border-b border-border bg-border">
          {weekdays.map((name) => (
            <li key={name} className="bg-muted px-2 py-1.5 text-caption font-semibold">
              {name}
            </li>
          ))}
        </ol>
        <ol aria-label={m.calendar_grid()} className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: month.leading }, (_, index) => (
            <li key={`lead-${index}`} aria-hidden="true" className="bg-muted/60" />
          ))}
          {month.days.map((date) => (
            <DayCell key={date} date={date} today={today} isOver={drag?.over === date}>
              {(byDay.get(date) ?? []).map((task) => (
                <CardChip
                  key={task.id}
                  task={task}
                  code={codeOf(task)}
                  finished={isFinished(task)}
                  movable={canEdit}
                  onShift={(days) => {
                    const target = addDays({ date: task.dueDate ?? today, days });
                    refocus.current = { taskId: task.id, date: target };
                    moveTo({ task, date: target });
                    if (!month.days.includes(target)) onMonthChange(target);
                  }}
                />
              ))}
            </DayCell>
          ))}
          {Array.from({ length: trailing }, (_, index) => (
            <li key={`trail-${index}`} aria-hidden="true" className="bg-muted/60" />
          ))}
        </ol>
      </div>
      <output className="sr-only">{announcement}</output>
      {/* The card's copy at the pointer, on the body; only while dragging, which never happens on the server. */}
      {drag &&
        createPortal(
          <div
            className="pointer-events-none fixed start-(--drag-x) top-(--drag-y) z-50 w-56"
            // The pointer's x is from the left; in right-to-left the start edge is the right one.
            style={
              {
                "--drag-x": `${(getLocale() === "fa" ? window.innerWidth - drag.x : drag.x) - 12}px`,
                "--drag-y": `${drag.y - 12}px`,
              } as CSSProperties
            }
          >
            <CardChip
              task={drag.task}
              code={codeOf(drag.task)}
              finished={isFinished(drag.task)}
              movable={false}
              overlay
            />
          </div>,
          document.body,
        )}
    </DndContext>
  );
}
