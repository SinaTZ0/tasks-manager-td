import { useId, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/primitive/dialog/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Textarea } from "#/components/primitive/textarea/textarea";
import { STATUS_REASON_MAX_LENGTH } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Status Reason Dialog =====*/

/**
 * Asks why before a pause or a stop (docs/app.md rule 5): a stop needs a reason, a pause may have one. Confirming hands
 * the reason over and closes; the action itself shows on the board at once. `finalFocus` says where focus goes after,
 * since the card that opened it may have moved to another column by then.
 */
export function StatusReasonDialog({
  action,
  code,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: {
  action: "pause" | "stop";
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  finalFocus?: () => HTMLElement | boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const id = useId();
  const required = action === "stop";

  const confirm = () => {
    if (required && reason.trim() === "") return setError(m.task_error_reason_required());
    onConfirm(reason.trim());
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setReason("");
          setError(undefined);
        }
      }}
    >
      <DialogContent finalFocus={finalFocus}>
        {/* Checked here, so the message is ours and in the page's language, not the browser's. */}
        <form
          noValidate
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <DialogHeader>
            <DialogTitle>{required ? m.task_stop_title({ code }) : m.task_pause_title({ code })}</DialogTitle>
            <DialogDescription>{required ? m.task_stop_description() : m.task_pause_description()}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor={id}>{required ? m.task_reason_label() : m.task_reason_optional_label()}</FieldLabel>
            <Textarea
              id={id}
              rows={3}
              value={reason}
              maxLength={STATUS_REASON_MAX_LENGTH}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={`${id}-hint`}
              required={required}
            />
            <FieldDescription id={`${id}-hint`}>{m.task_reason_hint()}</FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
          <DialogFooter showCloseButton>
            <Button type="submit" variant={required ? "destructive" : "default"}>
              {required ? m.task_action_stop() : m.task_action_pause()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
