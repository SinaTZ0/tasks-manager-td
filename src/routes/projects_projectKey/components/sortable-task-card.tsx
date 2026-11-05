import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import type { ComponentProps, CSSProperties, KeyboardEventHandler, PointerEventHandler, ReactNode } from "react";

import { Button } from "#/components/primitive/button/button";
import { HoldKeyPlate } from "#/components/primitive/hold-key/hold-key";
import type { Person } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Label, TaskCard as TaskCardData } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { TaskCard } from "#/routes/projects_projectKey/components/task-card";

/*===== Card Grip =====*/

/** The id of a card's grip, found again after the card has moved. */
export const cardGripId = (taskId: string) => `task-grip-${taskId}`;

/**
 * The keyboard's way to pick the card up (Space or Enter, then the arrows). A pointer grabs the card anywhere, so the
 * grip prints only when Tab reaches it, past the end of the keys, and takes no room or presses until then.
 */
function CardGrip({ code, ...props }: { code: string } & Omit<ComponentProps<typeof Button>, "children">) {
  return (
    <Button
      variant="ghost-keyboard"
      size="icon-xs"
      aria-label={m.board_card_grip({ code })}
      className="absolute end-full me-0.5"
      {...props}
    >
      <GripVerticalIcon />
    </Button>
  );
}

/*===== Sortable Task Card =====*/

/**
 * A card that can be dragged within its column and to others (the board's `DndContext` does the moving). Only the
 * grip takes the keyboard listeners: the title is a link stretched over the card, and Enter on it must open the
 * drawer, not start a drag. While dragged, the card stays in the list as a dimmed placeholder under the moving copy.
 * It renders its own list item, which is what slides while the list makes room. The placeholder re-mounts in each
 * column it crosses into, so it leaves the menu out (see `TaskCard`'s `state`).
 */
export function SortableTaskCard({
  task,
  columnId,
  projectKey,
  labels,
  people,
  blockedBy,
  movable,
  folded,
  remind,
  menu,
  clip,
  watching,
  plate,
}: {
  task: TaskCardData;
  /** The column the card is shown in, which during a drag may not be the one stored yet. */
  columnId: string;
  projectKey: string;
  labels: Map<string, Label>;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up. */
  blockedBy: string[];
  /** False for a viewer: the card stays put, with no grip to pick it up. */
  movable: boolean;
  /** A filter leaves it out: it folds away instead of unmounting, so it can go and come back smoothly. */
  folded: boolean;
  /** The key that sets a reminder, on a card without one. */
  remind?: ReactNode;
  menu: ReactNode;
  /** The mark of the viewer's reminder. */
  clip?: ReactNode;
  /** The viewer watches it. */
  watching: boolean;
  /** What fills the corner under the tray (`TaskCard`). */
  plate?: ReactNode;
}) {
  const code = taskCode({ key: projectKey, number: task.number });
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", columnId },
    disabled: !movable,
    attributes: { roleDescription: m.board_drag_role_card() },
  });

  return (
    <li
      ref={setNodeRef}
      style={
        {
          "--drag-transform": CSS.Translate.toString(transform) ?? "none",
          // Side by side: turning a filter on stops the card's drag, and dnd-kit sets a transition in that same render.
          // The fold moves nothing a drag moves, so a drag still only runs dnd-kit's `transform`.
          "--drag-transition": transition ? `${transition}, var(--fold-transition)` : "var(--fold-transition)",
        } as CSSProperties
      }
      className="fold-away drag-motion"
      data-folded={folded || undefined}
      inert={folded}
    >
      <div>
        <TaskCard
          task={task}
          projectKey={projectKey}
          labels={labels}
          people={people}
          blockedBy={blockedBy}
          onPointerDown={listeners?.onPointerDown as PointerEventHandler<HTMLElement> | undefined}
          state={isDragging ? "placeholder" : "idle"}
          watching={watching}
          remind={isDragging ? undefined : remind}
          clip={clip}
          grip={
            movable && (
              <CardGrip
                ref={setActivatorNodeRef}
                id={cardGripId(task.id)}
                code={code}
                {...attributes}
                onKeyDown={listeners?.onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined}
              />
            )
          }
          menu={isDragging ? undefined : menu}
          plate={isDragging && plate ? <HoldKeyPlate /> : plate}
        />
      </div>
    </li>
  );
}
