import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type Over,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { GripVerticalIcon } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";

import { Button } from "#/components/primitive/button/button";
import { toast } from "#/components/primitive/toast/toast";
import { columnTitle } from "#/lib/column-title";
import { cn } from "#/lib/utils";
import { positionBetween } from "#/lib/position";
import { orpc } from "#/orpc/client";
import { isBackwardMove } from "#/orpc/project/constants";
import type { Column, Person, Project } from "#/orpc/project/contract";
import { COLUMN_ACTION_RULES, isColumnAction, taskCode, type TaskStatusAction } from "#/orpc/task/constants";
import type { Board as BoardData, Label, TaskCard as TaskCardData } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { BoardColumn } from "#/routes/projects_projectKey/components/board-column";
import { ConfirmDialog, type ConfirmRequest } from "#/routes/projects_projectKey/components/confirm-dialog";
import { CardGrip, cardGripId, SortableTaskCard } from "#/routes/projects_projectKey/components/sortable-task-card";
import { ReasonDialog, type ReasonRequest } from "#/routes/projects_projectKey/components/reason-dialog";
import { TaskCard } from "#/routes/projects_projectKey/components/task-card";
import { restoreTaskMenuFocus, TaskMenu, taskMenuKey } from "#/routes/projects_projectKey/components/task-menu";
import { TransferDialog, type TransferRequest } from "#/routes/projects_projectKey/components/transfer-dialog";
import { blockersOf, entersGuardedColumn, kindsOf } from "#/routes/projects_projectKey/dependencies";
import { useColumnMove, useTaskMove, useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

/*===== Drag State =====*/

/** Card ids per column id, in the order the board shows them. */
type Lanes = Record<string, string[]>;

/**
 * What is being dragged. A card's lanes are the board's own copy while it moves: crossing into another column moves
 * its id there at once (so that column opens a gap for it), and the drop turns the final place into a position key.
 * A column needs no copy; the sortable list shifts the others under it.
 *
 * After a drop the board keeps showing the dropped layout (`dropped-*`) until its data changes. The move writes the
 * cache at once, but the query tells the page a tick later: without this the card would render back in its old
 * column for that tick, flash, and re-mount (losing keyboard focus) on the way to its new one.
 */
type Drag =
  | { type: "task"; id: string; lanes: Lanes }
  | { type: "column"; id: string }
  | { type: "dropped-task"; lanes: Lanes; until: TaskCardData[] }
  | { type: "dropped-column"; order: string[]; until: Column[] };

const zoneId = (columnId: string) => `zone:${columnId}`;

/** What a dragged or targeted item is: a `task`, a `column`, or a column's card `zone`. */
const typeOf = (item: { data: { current?: unknown } }) => (item.data.current as { type?: string } | undefined)?.type;

const laneOf = ({ lanes, id }: { lanes: Lanes; id: string }) =>
  Object.keys(lanes).find((columnId) => lanes[columnId]?.includes(id));

/** The key between two neighbours. Two neighbours with the same key (from before the server resolved them) can't
 * have one between them, so the card goes just after the first. */
function keyBetween(before: string | null, after: string | null): string {
  return before !== null && after !== null && before >= after
    ? positionBetween(before, null)
    : positionBetween(before, after);
}

/**
 * Swallows the click a pointer drag ends with. Dropping a card where it started would otherwise land the click on its
 * title link and open the drawer.
 */
const stopClick = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

function swallowNextClick() {
  const stop = stopClick;
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

/*===== Keyboard Moves =====*/

const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Where an arrow key takes the dragged item: onto the nearest target in that direction on screen, a column for a
 * column, a card for a card (or the drop zone of a column with no other cards). dnd-kit's own
 * `sortableKeyboardCoordinates` works from list order and assumes it runs left to right, so in Persian the arrow
 * toward the start went nowhere; going by the screen works in both directions and in the wrapped grid.
 */
function keyboardTarget({
  event,
  context,
  lanes,
}: {
  event: KeyboardEvent;
  context: Parameters<KeyboardCoordinateGetter>[1]["context"];
  lanes: Lanes;
}): ReturnType<KeyboardCoordinateGetter> {
  const { active, collisionRect, droppableRects, droppableContainers } = context;
  if (!ARROWS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;
  // The keyboard sensor scrolls the board instead of moving the item when the target lies past the board's edge. It
  // reads `scrollLeft` as left-to-right; in a right-to-left board that value runs negative, so the scroll it asks for
  // toward the start is impossible and the key does nothing. Right to left, it is given no scrollers to handle (this
  // context is rebuilt on the next render), and dnd-kit's auto-scroll follows the moved item instead.
  if (document.dir === "rtl") context.scrollableAncestors = [];

  const movingColumn = typeOf(active) === "column";
  const horizontal = event.code === "ArrowLeft" || event.code === "ArrowRight";
  const from = { x: collisionRect.left + collisionRect.width / 2, y: collisionRect.top + collisionRect.height / 2 };
  let best: { rect: { left: number; top: number; width: number; height: number }; distance: number } | null = null;

  for (const target of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(target.id);
    if (!rect || target.id === active.id) continue;
    const type = typeOf(target);
    if (movingColumn !== (type === "column")) continue;
    if (type === "zone") {
      const columnId = (target.data.current as { columnId: string }).columnId;
      if ((lanes[columnId] ?? []).some((id) => id !== active.id)) continue;
    }

    const dx = rect.left + rect.width / 2 - from.x;
    const dy = rect.top + rect.height / 2 - from.y;
    const ahead =
      event.code === "ArrowRight"
        ? dx > 1
        : event.code === "ArrowLeft"
          ? dx < -1
          : event.code === "ArrowDown"
            ? dy > 1
            : dy < -1;
    if (!ahead) continue;
    // Straying off the arrow's line counts double, so ArrowLeft picks the card beside, not one further down.
    const distance = horizontal ? Math.abs(dx) + 2 * Math.abs(dy) : Math.abs(dy) + 2 * Math.abs(dx);
    if (!best || distance < best.distance) best = { rect, distance };
  }
  if (!best) return undefined;

  // Moving down, the item's bottom meets the target's, so a taller card is passed rather than landed on short.
  const { rect } = best;
  return {
    x: rect.left,
    y: event.code === "ArrowDown" ? rect.top + rect.height - collisionRect.height : rect.top,
  };
}

/*===== Sortable Column =====*/

/**
 * A column that takes cards (its body is a drop zone, so an empty column takes them too) and that an admin can move
 * by its grip.
 */
function SortableColumn({
  column,
  count,
  total,
  movable,
  children,
}: {
  column: Column;
  count: number;
  /** While filtering, how many cards the column holds in all. */
  total: number | undefined;
  movable: boolean;
  children: ReactNode;
}) {
  const title = columnTitle(column);
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: !movable,
    attributes: { roleDescription: m.board_drag_role_column() },
  });
  const zone = useDroppable({ id: zoneId(column.id), data: { type: "zone", columnId: column.id } });

  return (
    <BoardColumn
      ref={setNodeRef}
      bodyRef={zone.setNodeRef}
      style={
        {
          "--drag-transform": CSS.Translate.toString(transform) ?? "none",
          "--drag-transition": transition ?? "none",
        } as CSSProperties
      }
      dragging={isDragging}
      title={title}
      count={count}
      total={total}
      wipLimit={column.wipLimit}
      grip={
        movable && (
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon-xs"
            aria-label={m.board_column_grip({ column: title })}
            {...attributes}
            {...(listeners as Record<string, KeyboardEventHandler<HTMLButtonElement>> | undefined)}
          >
            <GripVerticalIcon />
          </Button>
        )
      }
    >
      {children}
    </BoardColumn>
  );
}

/*===== Board =====*/

/**
 * A column's cards, with a dashed rule printed in the gap between each pair. The rule is the lower card's ::before,
 * so it travels with that card while the list reorders under a drag.
 */
const CARD_LIST =
  "flex flex-col gap-5 [&>li+li]:relative [&>li+li]:before:absolute [&>li+li]:before:inset-x-2 [&>li+li]:before:-top-2.75 [&>li+li]:before:border-t-2 [&>li+li]:before:border-dashed [&>li+li]:before:border-muted-foreground/60";

/** The id of the page's "show cancelled" switch: where focus goes when a stopped card leaves the board. */
export const SHOW_CANCELLED_ID = "show-cancelled";

/**
 * The board's columns and cards, and every way of moving them (docs/app.md → Board & Drag): drag a card within its
 * column or to another, by pointer or keyboard; send it to the bottom of another column from its menu; and, for an
 * admin, drag a custom column by its grip (to do, doing and done keep their order). A move shows at once and is saved
 * behind it (`use-board-moves.ts`). Each card's menu also takes its status actions (start or pause the viewer's clock,
 * done, stop, reopen), asking for a reason where one is due. A card going back along the fixed columns (done to doing,
 * say) asks first, and so does starting the clock on a done card. A card that still waits for others enters doing or
 * done only once the person says why (rule 4); its strip names what it waits for.
 *
 * Columns the person hid (`hiddenColumns`) are left out, though a card's menu can still send a card to one. The
 * cancelled column is shown only on request (`showCancelled`), after the others and outside the dragging: nothing
 * is dropped into it, since stopping a task has its own action with its reason, and its cards leave it by reopening.
 */
export function Board({
  project,
  projectKey,
  board,
  labels,
  people,
  canMoveColumns,
  canMoveCards,
  canTransfer,
  filter,
  showCancelled,
  hiddenColumns,
}: {
  project: Project;
  /** The key as the URL has it, which names the project's cached query. */
  projectKey: string;
  board: BoardData;
  labels: Map<string, Label>;
  people: Map<string, Person>;
  canMoveColumns: boolean;
  /** Drag cards and use their menus: everyone but a viewer. */
  canMoveCards: boolean;
  /** Move or copy a card to another project: admins only. */
  canTransfer: boolean;
  /**
   * The cards a filter keeps, or null for all. While filtering, cards don't drag (a position between the cards shown
   * could land between hidden ones); their menus still move them.
   */
  filter: ((task: TaskCardData) => boolean) | null;
  showCancelled: boolean;
  /** The ids of the columns taken off the board. */
  hiddenColumns: ReadonlySet<string>;
}) {
  const moveTask = useTaskMove(project.id);
  const transition = useTaskTransition(project);
  const watching = useMemo(() => new Set(board.watching), [board.watching]);
  // Kept after the dialog closes, so it plays its way out showing what it asked.
  const [transfer, setTransfer] = useState<(TransferRequest & { open: boolean }) | null>(null);
  // Kept after the dialog closes, so it can play its way out showing what it asked. `run` takes the action with the
  // reason given.
  const [asking, setAsking] = useState<{
    taskId: string;
    request: ReasonRequest;
    run: (reason: string) => void;
    open: boolean;
  } | null>(null);
  // Kept after closing for the same reason; `run` goes ahead once confirmed.
  const [confirming, setConfirming] = useState<{
    taskId: string;
    request: ConfirmRequest;
    run: () => void;
    open: boolean;
  } | null>(null);
  // Which card the viewer's own clock runs on: its menu offers pause there. Only menus read it, so it can wait for the
  // browser.
  const { data: myTimer } = useQuery(orpc.time.current.queryOptions());
  const moveColumn = useColumnMove({ projectId: project.id, projectKey });
  const [drag, setDrag] = useState<Drag | null>(null);
  const droppedOrder = drag?.type === "dropped-column" && drag.until === project.columns ? drag.order : null;
  // Every column but cancelled, for the cards' menus; `columns` is the ones on the board, which everything else uses.
  // A dropped column's order names only the columns on the board, so it is applied after the hidden ones are out.
  const allColumns = useMemo(() => project.columns.filter((column) => column.kind !== "cancelled"), [project.columns]);
  const columns = useMemo(() => {
    const shown = allColumns.filter((column) => !hiddenColumns.has(column.id));
    return droppedOrder ? shown.toSorted((a, b) => droppedOrder.indexOf(a.id) - droppedOrder.indexOf(b.id)) : shown;
  }, [allColumns, hiddenColumns, droppedOrder]);
  // dnd-kit numbers its accessibility ids from a counter of its own, which differs between server and browser.
  const contextId = useId();

  /*------ Lookups ------*/
  const tasks = useMemo(() => new Map(board.tasks.map((task) => [task.id, task])), [board.tasks]);
  const kinds = useMemo(() => kindsOf(project), [project]);
  const blockerCodes = (task: TaskCardData) =>
    blockersOf({ task, tasks, kinds }).map((blocker) => taskCode({ key: project.key, number: blocker.number }));
  const settled = useMemo<Lanes>(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.id,
          board.tasks.filter((task) => task.columnId === column.id && (!filter || filter(task))).map((task) => task.id),
        ]),
      ),
    [columns, board.tasks, filter],
  );
  const totals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of board.tasks) counts.set(task.columnId, (counts.get(task.columnId) ?? 0) + 1);
    return counts;
  }, [board.tasks]);
  const lanes =
    drag?.type === "task" || (drag?.type === "dropped-task" && drag.until === board.tasks) ? drag.lanes : settled;
  const cancelled = project.columns.find((column) => column.kind === "cancelled");
  const cancelledTasks = board.tasks.filter((task) => task.columnId === cancelled?.id && (!filter || filter(task)));
  const titles = useMemo(() => new Map(columns.map((column) => [column.id, columnTitle(column)])), [columns]);
  const codeOf = (id: UniqueIdentifier) => {
    const task = tasks.get(String(id));
    return task ? taskCode({ key: project.key, number: task.number }) : "";
  };

  /*------ Collisions ------*/
  // Collision detection and announcements run inside dnd-kit, between renders: they read the latest lanes from a ref.
  const lanesRef = useRef(lanes);
  // Right after a card crosses into another column, the lanes re-render under the pointer and the closest target can
  // flip back to the column it left. Holding the last target for a frame stops that flicker (dnd-kit's
  // multiple-containers recipe).
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const justCrossed = useRef(false);
  useLayoutEffect(() => {
    lanesRef.current = lanes;
    requestAnimationFrame(() => {
      justCrossed.current = false;
    });
  }, [lanes]);

  const collisionDetection = useMemo<CollisionDetection>(
    () => (args) => {
      if (typeOf(args.active) === "column") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((target) => typeOf(target) === "column"),
        });
      }

      const targets = args.droppableContainers.filter((target) => typeOf(target) !== "column");
      // A pointer picks the column it is over, then the closest card in it; the keyboard has no pointer, so it takes
      // the closest target in the direction it moved.
      const pointerHits = pointerWithin({ ...args, droppableContainers: targets });
      let hits = pointerHits.length > 0 ? pointerHits : closestCorners({ ...args, droppableContainers: targets });
      const zone = hits.find((hit) => String(hit.id).startsWith("zone:"));
      if (pointerHits.length > 0 && zone) {
        const lane = lanesRef.current[String(zone.id).slice("zone:".length)] ?? [];
        const cards = targets.filter((target) => lane.includes(String(target.id)));
        hits = cards.length > 0 ? closestCenter({ ...args, droppableContainers: cards }) : [zone];
      }

      const overId = hits[0]?.id ?? null;
      if (overId !== null) {
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      if (justCrossed.current) lastOverId.current = args.active.id;
      return lastOverId.current === null ? [] : [{ id: lastOverId.current }];
    },
    [],
  );

  /*------ Drag Handlers ------*/
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the card still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context }) => keyboardTarget({ event, context, lanes: lanesRef.current }),
    }),
  );

  // A card dragged by keyboard into another column re-mounts there, so dnd-kit can't hand focus back to its grip.
  const byKeyboard = useRef(false);
  const refocus = (id: string) => {
    if (!byKeyboard.current) return;
    requestAnimationFrame(() => document.getElementById(cardGripId(id))?.focus());
  };

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    byKeyboard.current = activatorEvent instanceof KeyboardEvent;
    const id = String(active.id);
    setDrag(typeOf(active) === "column" ? { type: "column", id } : { type: "task", id, lanes: settled });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || typeOf(active) !== "task") return;
    const id = String(active.id);
    const overId = String(over.id);
    const overZone = typeOf(over) === "zone";

    setDrag((current) => {
      if (current?.type !== "task") return current;
      const from = laneOf({ lanes: current.lanes, id });
      const to = overZone
        ? (over.data.current as { columnId: string }).columnId
        : laneOf({ lanes: current.lanes, id: overId });
      if (!from || !to || from === to) return current;

      // Within the new column, the card goes before the card it's over, or after it once past that card's middle.
      const target = current.lanes[to] ?? [];
      const translated = active.rect.current.translated;
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      const index = overZone ? target.length : target.indexOf(overId) + (below ? 1 : 0);
      justCrossed.current = true;
      return {
        ...current,
        lanes: {
          ...current.lanes,
          [from]: (current.lanes[from] ?? []).filter((item) => item !== id),
          [to]: [...target.slice(0, index), id, ...target.slice(index)],
        },
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = drag;
    const id = String(active.id);
    setDrag(null);
    swallowNextClick();
    if (current?.type === "task") refocus(id);
    if (!over || (current?.type !== "task" && current?.type !== "column")) return;

    /*------ Column ------*/
    if (current.type === "column") {
      const from = columns.findIndex((column) => column.id === id);
      const to = columns.findIndex((column) => column.id === over.id);
      if (from === to || to < 0) return;
      const order = arrayMove(columns, from, to);
      setDrag({ type: "dropped-column", order: order.map((column) => column.id), until: project.columns });
      // Between its new neighbours on the board. The cancelled column and any hidden one aren't shown, so where the
      // moved column falls against them doesn't matter.
      moveColumn({
        columnId: id,
        position: keyBetween(order[to - 1]?.position ?? null, order[to + 1]?.position ?? null),
      });
      return;
    }

    /*------ Card ------*/
    const columnId = laneOf({ lanes: current.lanes, id });
    const task = tasks.get(id);
    if (!columnId || !task) return;
    let lane = current.lanes[columnId] ?? [];
    const overId = String(over.id);
    if (typeOf(over) === "task" && overId !== id && lane.includes(overId)) {
      lane = arrayMove(lane, lane.indexOf(id), lane.indexOf(overId));
    }
    const unchanged = (settled[columnId] ?? []).join() === lane.join();
    if (task.columnId === columnId && unchanged) return;

    const index = lane.indexOf(id);
    const positionOf = (neighbour: string | undefined) =>
      neighbour === undefined ? null : (tasks.get(neighbour)?.position ?? null);
    const position = keyBetween(positionOf(lane[index - 1]), positionOf(lane[index + 1]));
    const run = (forceComment?: string) => moveTask({ taskId: id, columnId, position, forceComment });
    // A card going back, or a blocked one, goes back to its place until the person confirms or says why.
    if (confirmBack({ task, toColumnId: columnId, run: () => guard({ task, toColumnId: columnId, run }) || run() })) {
      return;
    }
    if (guard({ task, toColumnId: columnId, run })) return;
    setDrag({ type: "dropped-task", lanes: { ...current.lanes, [columnId]: lane }, until: board.tasks });
    run();
  };

  /*------ Menu Focus ------*/
  // A card sent elsewhere from its menu re-mounts in its new column; once it is drawn there, its menu key gets focus
  // back if the closing menu dropped it.
  const menuFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = menuFocus.current;
    if (!id || !board.tasks.some((task) => task.id === id)) return;
    menuFocus.current = null;
    requestAnimationFrame(() => restoreTaskMenuFocus(id));
  }, [board.tasks]);

  /*------ Blocked Moves ------*/
  /**
   * Rule 4: a card that still waits for others asks why before it enters doing or done, and `run` moves it with that
   * reason.
   *
   * @returns Whether it asked, in which case the caller doesn't move the card itself.
   */
  function guard({
    task,
    toColumnId,
    run,
  }: {
    task: TaskCardData;
    toColumnId: string;
    run: (forceComment: string) => void;
  }): boolean {
    const blockers = blockerCodes(task);
    if (blockers.length === 0 || !entersGuardedColumn({ from: kinds.get(task.columnId), to: kinds.get(toColumnId) })) {
      return false;
    }
    const code = codeOf(task.id);
    setAsking({ taskId: task.id, request: { kind: "force", code, blockers }, run, open: true });
    return true;
  }

  /*------ Backward Moves ------*/
  /**
   * A card going back along the fixed columns (done to doing or to do, doing to to do) asks first, and `run` moves it
   * once the person confirms.
   *
   * @returns Whether it asked, in which case the caller doesn't move the card itself.
   */
  function confirmBack({
    task,
    toColumnId,
    run,
  }: {
    task: TaskCardData;
    toColumnId: string;
    run: () => void;
  }): boolean {
    const from = project.columns.find((column) => column.id === task.columnId);
    const to = project.columns.find((column) => column.id === toColumnId);
    if (!from || !to || !isBackwardMove({ from: from.kind, to: to.kind })) return false;
    const code = codeOf(task.id);
    const request = {
      title: m.task_back_title({ code }),
      description: m.task_move_description({ from: columnTitle(from), to: columnTitle(to) }),
      confirm: m.task_back_confirm(),
    };
    setConfirming({ taskId: task.id, request, run, open: true });
    return true;
  }

  /*------ Move To ------*/
  const moveToEnd = ({ task, columnId }: { task: TaskCardData; columnId: string }) => {
    const last = board.tasks.findLast((item) => item.columnId === columnId && item.id !== task.id);
    const position = positionBetween(last?.position ?? null, null);
    const run = (forceComment?: string) => {
      menuFocus.current = task.id;
      moveTask({ taskId: task.id, columnId, position, forceComment });
    };
    const ahead = () => guard({ task, toColumnId: columnId, run }) || run();
    if (confirmBack({ task, toColumnId: columnId, run: ahead })) return;
    ahead();
  };

  /*------ Status ------*/
  const takeAction = ({ task, action }: { task: TaskCardData; action: TaskStatusAction }) => {
    const code = codeOf(task.id);
    if (action === "stop") {
      return setAsking({
        taskId: task.id,
        request: { kind: action, code },
        run: (reason) => {
          transition({ taskId: task.id, action, reason });
          // A stopped card leaves the board unless the cancelled column is shown: say where it went.
          if (!showCancelled) toast.add({ title: m.task_stopped_hidden({ code }), type: "success" });
        },
        open: true,
      });
    }
    const run = (forceComment?: string) => {
      menuFocus.current = task.id;
      transition({ taskId: task.id, action, forceComment });
    };

    /*------ Clock ------*/
    // A chronometer: the clock starts and stops at once, and leaves the card where it is.
    if (!isColumnAction(action)) return run();

    /*------ Move ------*/
    const target = project.columns.find((column) => column.kind === COLUMN_ACTION_RULES[action].to);
    const ahead = () => (target && guard({ task, toColumnId: target.id, run })) || run();
    if (target && confirmBack({ task, toColumnId: target.id, run: ahead })) return;
    ahead();
  };

  /*------ Announcements ------*/
  // Where a card would land: its column, its place there, and how many cards the column would hold.
  const placeOf = ({ active, over }: { active: Active; over: Over }) => {
    const id = String(active.id);
    const overId = String(over.id);
    const columnId =
      typeOf(over) === "zone"
        ? (over.data.current as { columnId: string }).columnId
        : laneOf({ lanes: lanesRef.current, id: overId });
    const lane = columnId ? (lanesRef.current[columnId] ?? []) : [];
    const others = lane.filter((item) => item !== id);
    const position =
      typeOf(over) === "zone" ? others.length + 1 : overId === id ? lane.indexOf(id) + 1 : others.indexOf(overId) + 1;
    return { code: codeOf(id), column: (columnId && titles.get(columnId)) || "", position, total: others.length + 1 };
  };
  const columnPlaceOf = ({ active, over }: { active: Active; over: Over }) => ({
    column: titles.get(String(active.id)) ?? "",
    position: columns.findIndex((column) => column.id === over.id) + 1,
    total: columns.length,
  });

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      typeOf(active) === "column"
        ? m.board_column_picked({ column: titles.get(String(active.id)) ?? "" })
        : m.board_card_picked({ code: codeOf(active.id) }),
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      return typeOf(active) === "column"
        ? m.board_column_over(columnPlaceOf({ active, over }))
        : m.board_card_over(placeOf({ active, over }));
    },
    onDragEnd: ({ active, over }) => {
      if (typeOf(active) === "column") {
        const column = titles.get(String(active.id)) ?? "";
        return over ? m.board_column_dropped(columnPlaceOf({ active, over })) : m.board_column_returned({ column });
      }
      return over
        ? m.board_card_dropped(placeOf({ active, over }))
        : m.board_card_returned({ code: codeOf(active.id) });
    },
    onDragCancel: ({ active }) =>
      typeOf(active) === "column"
        ? m.board_column_returned({ column: titles.get(String(active.id)) ?? "" })
        : m.board_card_returned({ code: codeOf(active.id) }),
  };

  /*------ Render ------*/
  const dragged = drag?.type === "task" ? tasks.get(drag.id) : undefined;

  return (
    <DndContext
      id={contextId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={({ active }) => {
        setDrag(null);
        refocus(String(active.id));
      }}
      accessibility={{ announcements, screenReaderInstructions: { draggable: m.board_drag_instructions() } }}
    >
      {/* Browsers make a scrolling box keyboard-focusable themselves, so it gets the focus ring but no `tabIndex`. */}
      <section
        aria-label={m.board_columns()}
        className={cn(
          "-m-2 flex items-start gap-3 overflow-x-auto p-2 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid",
          // The person's layout (src/lib/board-layout.ts): wrapped columns form a grid.
          "board-wrap:grid board-wrap:board-grid",
        )}
      >
        <SortableContext items={columns.map((column) => column.id)} strategy={rectSortingStrategy}>
          {columns.map((column) => {
            const ids = lanes[column.id] ?? [];
            return (
              <SortableColumn
                key={column.id}
                column={column}
                count={ids.length}
                total={filter ? (totals.get(column.id) ?? 0) : undefined}
                movable={canMoveColumns && column.kind === "custom"}
              >
                <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
                  <ol className={CARD_LIST}>
                    {ids.map((id) => {
                      const task = tasks.get(id);
                      if (!task) return null;
                      return (
                        <SortableTaskCard
                          key={id}
                          task={task}
                          columnId={column.id}
                          projectKey={project.key}
                          labels={labels}
                          people={people}
                          blockedBy={blockerCodes(task)}
                          movable={canMoveCards && !filter}
                          watching={watching.has(task.id)}
                          menu={
                            canMoveCards && (
                              <TaskMenu
                                taskId={task.id}
                                code={codeOf(task.id)}
                                kind={column.kind}
                                timing={myTimer?.taskId === task.id}
                                columns={allColumns}
                                currentColumnId={column.id}
                                onMove={(target) => moveToEnd({ task, columnId: target })}
                                onAction={(action) => takeAction({ task, action })}
                                onTransfer={
                                  canTransfer
                                    ? (mode) =>
                                        setTransfer({
                                          taskId: task.id,
                                          code: codeOf(task.id),
                                          kind: column.kind,
                                          mode,
                                          open: true,
                                        })
                                    : undefined
                                }
                              />
                            )
                          }
                        />
                      );
                    })}
                  </ol>
                </SortableContext>
              </SortableColumn>
            );
          })}
        </SortableContext>

        {/*------ Cancelled ------*/}
        {showCancelled && cancelled && (
          <BoardColumn
            title={columnTitle(cancelled)}
            count={cancelledTasks.length}
            total={filter ? (totals.get(cancelled.id) ?? 0) : undefined}
            wipLimit={null}
          >
            <ol className={CARD_LIST}>
              {cancelledTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    stopped
                    watching={watching.has(task.id)}
                    task={task}
                    projectKey={project.key}
                    labels={labels}
                    people={people}
                    menu={
                      canMoveCards && (
                        <TaskMenu
                          taskId={task.id}
                          code={codeOf(task.id)}
                          kind="cancelled"
                          timing={false}
                          columns={[]}
                          currentColumnId={cancelled.id}
                          onMove={() => {}}
                          onAction={(action) => takeAction({ task, action })}
                          onTransfer={
                            canTransfer
                              ? (mode) =>
                                  setTransfer({
                                    taskId: task.id,
                                    code: codeOf(task.id),
                                    kind: "cancelled",
                                    mode,
                                    open: true,
                                  })
                              : undefined
                          }
                        />
                      )
                    }
                  />
                </li>
              ))}
            </ol>
          </BoardColumn>
        )}
      </section>

      {/*------ Reason ------*/}
      {asking && (
        <ReasonDialog
          request={asking.request}
          open={asking.open}
          onOpenChange={(open) => setAsking({ ...asking, open })}
          onConfirm={asking.run}
          finalFocus={() => {
            const key = taskMenuKey(asking.taskId)();
            return key === true ? (document.getElementById(SHOW_CANCELLED_ID) ?? true) : key;
          }}
        />
      )}

      {/*------ Confirm ------*/}
      {confirming && (
        <ConfirmDialog
          request={confirming.request}
          open={confirming.open}
          onOpenChange={(open) => setConfirming({ ...confirming, open })}
          onConfirm={confirming.run}
          finalFocus={taskMenuKey(confirming.taskId)}
        />
      )}

      {/*------ Other Projects ------*/}
      {transfer && (
        <TransferDialog
          // A fresh form for each card and mode.
          key={`${transfer.taskId}-${transfer.mode}`}
          projectId={project.id}
          request={transfer}
          open={transfer.open}
          onOpenChange={(open) => setTransfer({ ...transfer, open })}
          finalFocus={taskMenuKey(transfer.taskId)}
        />
      )}

      {/*------ Moving Copy ------*/}
      <DragOverlay>
        {dragged && (
          <TaskCard
            task={dragged}
            projectKey={project.key}
            labels={labels}
            people={people}
            blockedBy={blockerCodes(dragged)}
            state="overlay"
            watching={watching.has(dragged.id)}
            grip={<CardGrip code={codeOf(dragged.id)} />}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
