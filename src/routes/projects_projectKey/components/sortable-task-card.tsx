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
 * The grip on a card's header strip. It is the keyboard's way to pick the card up (Space or Enter, then the arrows);
 * a pointer can grab the card anywhere.
 */
export function CardGrip({ code, ...props }: { code: string } & Omit<ComponentProps<typeof Button>, "children">) {
  return (
    <Button variant="ghost" size="icon-xs" aria-label={m.board_card_grip({ code })} {...props}>
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
  menu,
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
  menu: ReactNode;
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
          "--drag-transition": transition ?? "none",
        } as CSSProperties
      }
      className="drag-motion"
    >
      <TaskCard
        task={task}
        projectKey={projectKey}
        labels={labels}
        people={people}
        blockedBy={blockedBy}
        onPointerDown={listeners?.onPointerDown as PointerEventHandler<HTMLElement> | undefined}
        state={isDragging ? "placeholder" : "idle"}
        watching={watching}
        grip={
          movable && (
            <CardGrip
              ref={setActivatorNodeRef}
              code={code}
              {...attributes}
              onKeyDown={listeners?.onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined}
            />
          )
        }
        menu={isDragging ? undefined : menu}
        plate={isDragging && plate ? <HoldKeyPlate /> : plate}
      />
    </li>
  );
}
