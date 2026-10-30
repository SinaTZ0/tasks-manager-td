import { EllipsisIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/primitive/dropdown-menu/dropdown-menu";
import { columnTitle } from "#/lib/column-title";
import type { Column } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";

/*===== Move To Menu =====*/

/** The id of a card's menu key, found again after the card has moved. */
const taskMenuId = (taskId: string) => `task-menu-${taskId}`;

/**
 * The card's menu key: "Move to…" every other column, so moving a card never depends on dragging it (docs/app.md →
 * Board & Drag). The card goes to the bottom of the column it is sent to.
 */
export function MoveToMenu({
  taskId,
  code,
  columns,
  currentColumnId,
  onMove,
}: {
  taskId: string;
  code: string;
  /** The board's columns, in order. */
  columns: Column[];
  currentColumnId: string;
  onMove: (columnId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            id={taskMenuId(taskId)}
            variant="ghost"
            size="icon-xs"
            aria-label={m.task_actions({ code })}
            // Pressing the key opens the menu; it must not also pick the card up.
            onPointerDown={(event) => event.stopPropagation()}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      {/* The card re-mounts in its new column, so the key that opened the menu is gone when it closes: focus goes to the
          same key on the moved card instead. */}
      <DropdownMenuContent
        align="end"
        className="min-w-44"
        finalFocus={() => document.getElementById(taskMenuId(taskId)) ?? true}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.task_move_to()}</DropdownMenuLabel>
          {columns
            .filter((column) => column.id !== currentColumnId)
            .map((column) => (
              <DropdownMenuItem key={column.id} onClick={() => onMove(column.id)}>
                {columnTitle(column)}
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
