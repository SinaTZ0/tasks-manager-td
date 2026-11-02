import { CopyIcon, EllipsisIcon, FolderInputIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/primitive/dropdown-menu/dropdown-menu";
import { columnTitle } from "#/lib/column-title";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Column } from "#/orpc/project/contract";
import type { TaskStatusAction } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import type { TransferMode } from "#/routes/projects_projectKey/components/transfer-dialog";
import { availableActions, statusActionIcon, statusActionLabel } from "#/routes/projects_projectKey/task-status";

/*===== Task Menu =====*/

/** The id of a card's menu key, found again after the card has moved. */
const taskMenuId = (taskId: string) => `task-menu-${taskId}`;

/**
 * Focus for after the menu, or the dialog it opened, closes: the same key on the card, wherever the card is now (it
 * re-mounts in its new column, so the key that opened them is gone).
 */
export const taskMenuKey = (taskId: string) => () => document.getElementById(taskMenuId(taskId)) ?? true;

/**
 * Puts focus back on a card's menu key if it was lost. The menu can close a moment before the card re-mounts in its
 * new column, handing focus to the old key just as it goes; the board calls this once the card is drawn in its place.
 */
export function restoreTaskMenuFocus(taskId: string) {
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return;
  document.getElementById(taskMenuId(taskId))?.focus();
}

/**
 * The card's menu key: the status actions it allows now (done, stop, reopen), then
 * "move to…" every other column, so changing a card never depends on dragging it (docs/app.md → Board & Drag). The board takes the
 * action, asking for a reason first where one is due. A moved card goes to the bottom of its new column. A cancelled
 * card only reopens: `columns` is empty there. For an admin, `onTransfer` adds moving or copying it to another project.
 */
export function TaskMenu({
  taskId,
  code,
  kind,
  columns,
  currentColumnId,
  onMove,
  onAction,
  onTransfer,
}: {
  taskId: string;
  code: string;
  /** The kind of the column the card is in. */
  kind: ColumnKind;
  /** The board's columns, in order; empty for none to move to. */
  columns: Column[];
  currentColumnId: string;
  onMove: (columnId: string) => void;
  onAction: (action: TaskStatusAction) => void;
  onTransfer?: ((mode: TransferMode) => void) | undefined;
}) {
  const actions = availableActions(kind);
  const targets = columns.filter((column) => column.id !== currentColumnId);

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
      <DropdownMenuContent align="end" className="min-w-44" finalFocus={taskMenuKey(taskId)}>
        {/*------ Status ------*/}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.task_status()}</DropdownMenuLabel>
          {actions.map((action) => {
            const Icon = statusActionIcon(action);
            return (
              <DropdownMenuItem key={action} onClick={() => onAction(action)}>
                <Icon />
                {statusActionLabel(action)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        {/*------ Move To ------*/}
        {targets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{m.task_move_to()}</DropdownMenuLabel>
              {targets.map((column) => (
                <DropdownMenuItem key={column.id} onClick={() => onMove(column.id)}>
                  {columnTitle(column)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/*------ Other Projects ------*/}
        {onTransfer && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onTransfer("move")}>
                <FolderInputIcon />
                {m.transfer_move()}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTransfer("copy")}>
                <CopyIcon />
                {m.transfer_copy()}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
