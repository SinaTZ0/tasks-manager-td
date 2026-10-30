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
import { formatList } from "#/lib/locale";
import { COMMENT_MAX_LENGTH, STATUS_REASON_MAX_LENGTH } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Reason Dialog =====*/

/** What a reason dialog asks: a pause's or a stop's reason (rule 5), or why a blocked task goes ahead (rule 4). */
export type ReasonRequest =
  { kind: "pause" | "stop"; code: string } | { kind: "force"; code: string; blockers: string[] };

function wordingOf(request: ReasonRequest) {
  switch (request.kind) {
    case "pause":
      return {
        title: m.task_pause_title({ code: request.code }),
        description: m.task_pause_description(),
        label: m.task_reason_optional_label(),
        hint: m.task_reason_hint(),
        confirm: m.task_action_pause(),
        required: false,
        max: STATUS_REASON_MAX_LENGTH,
      };
    case "stop":
      return {
        title: m.task_stop_title({ code: request.code }),
        description: m.task_stop_description(),
        label: m.task_reason_label(),
        hint: m.task_reason_hint(),
        confirm: m.task_action_stop(),
        required: true,
        max: STATUS_REASON_MAX_LENGTH,
      };
    case "force":
      return {
        title: m.dependency_force_title({ code: request.code }),
        description: m.dependency_force_description({ blockers: formatList(request.blockers) }),
        label: m.dependency_force_label(),
        hint: m.dependency_force_hint(),
        confirm: m.dependency_force_confirm(),
        required: true,
        max: COMMENT_MAX_LENGTH,
      };
  }
}

/**
 * Asks why before an action that needs or takes a reason: a stop needs one and a pause may have one (rule 5); moving a
 * blocked task into doing or done needs one, which becomes a comment on it (rule 4). Confirming hands the reason over
 * and closes; the action itself shows on the board at once. `finalFocus` says where focus goes after, since the card
 * that opened it may have moved to another column by then.
 */
export function ReasonDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: {
  request: ReasonRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  finalFocus?: () => HTMLElement | boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const id = useId();
  const wording = wordingOf(request);
  const destructive = request.kind === "stop";

  const confirm = () => {
    if (wording.required && reason.trim() === "") {
      return setError(
        request.kind === "force" ? m.dependency_error_comment_required() : m.task_error_reason_required(),
      );
    }
    onConfirm(reason.trim());
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Emptied once it has finished closing, so the next request starts blank without the text vanishing on the way out.
      onOpenChangeComplete={(next) => {
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
            <DialogTitle>{wording.title}</DialogTitle>
            <DialogDescription>{wording.description}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor={id}>{wording.label}</FieldLabel>
            <Textarea
              id={id}
              rows={3}
              value={reason}
              maxLength={wording.max}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={`${id}-hint`}
              required={wording.required}
            />
            <FieldDescription id={`${id}-hint`}>{wording.hint}</FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
          <DialogFooter showCloseButton>
            <Button type="submit" variant={destructive ? "destructive" : "default"}>
              {wording.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
