import type { ReactNode } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/primitive/dialog/dialog";

/*===== Confirm Dialog =====*/

/** What a confirmation asks, and the key that goes ahead. */
export type ConfirmRequest = { title: string; description: string; confirm: ReactNode };

/**
 * Asks before a step back or a step out of the usual (a card going back along the fixed columns). Confirming runs it
 * and closes; closing any other way leaves everything as it was. `finalFocus` says where focus goes after, since the
 * card that asked may have moved by then.
 */
export function ConfirmDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: {
  request: ConfirmRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  finalFocus?: () => HTMLElement | boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {request.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
