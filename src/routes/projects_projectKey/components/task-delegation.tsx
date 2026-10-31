import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, ForwardIcon } from "lucide-react";
import { Fragment, useId, useState } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { Textarea } from "#/components/primitive/textarea/textarea";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import { DELEGATION_NOTE_MAX_LENGTH } from "#/orpc/delegation/constants";
import type { Handoff } from "#/orpc/delegation/contract";
import type { Project } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Task Delegation =====*/

/**
 * The drawer's hand-offs (docs/app.md → Assign & Delegate): who has had the task, in order (Sina → Ali → Reza), each
 * hand-off's note, and a key to hand it on. Handing on adds someone to the assignees, in the viewer's place if they
 * were one, and tells them; the others on it and the owner stay.
 */
export function TaskDelegation({
  task,
  project,
  code,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  code: string;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="task-delegation-title" className="flex flex-col gap-3">
      <h3 id="task-delegation-title" className="text-body-sm font-semibold">
        {m.delegation_title()}
      </h3>
      {task.handoffs.length > 0 ? (
        <HandoffChain handoffs={task.handoffs} />
      ) : (
        <p className="text-body-sm text-muted-foreground">{m.delegation_none()}</p>
      )}
      {!readOnly && (
        <>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setOpen(true)}>
            <ForwardIcon data-icon="inline-start" />
            {m.delegation_delegate()}
          </Button>
          <DelegateDialog task={task} project={project} code={code} open={open} onOpenChange={setOpen} />
        </>
      )}
    </section>
  );
}

/*===== Chain =====*/

/** The names in order with arrows between them, then each hand-off with its date and note. */
function HandoffChain({ handoffs }: { handoffs: Handoff[] }) {
  const names = [handoffs[0]?.fromName ?? "", ...handoffs.map((handoff) => handoff.toName)];

  return (
    <>
      <p className="flex flex-wrap items-center gap-1.5 text-body-sm font-semibold">
        {names.map((name, index) => (
          // Names can repeat (a task handed back), so the place in the chain is the key.
          <Fragment key={index}>
            {index > 0 && (
              <ArrowRightIcon
                aria-label={m.delegation_to()}
                className="size-3.5 text-muted-foreground rtl:rotate-180"
              />
            )}
            <span>{name}</span>
          </Fragment>
        ))}
      </p>
      <ol className="flex flex-col striped">
        {handoffs.toReversed().map((handoff) => (
          <li key={handoff.id} className="flex flex-col gap-0.5 py-2">
            <span className="text-caption text-muted-foreground">
              {m.delegation_entry({
                from: handoff.fromName,
                to: handoff.toName,
                date: formatDate(handoff.at, { dateStyle: "medium", timeStyle: "short" }),
              })}
            </span>
            {handoff.note && <span className="text-body-sm whitespace-pre-line">{handoff.note}</span>}
          </li>
        ))}
      </ol>
    </>
  );
}

/*===== Delegate Dialog =====*/

/** Picks who joins the task (any active editor not on it yet) and what they should know. */
function DelegateDialog({
  task,
  project,
  code,
  open,
  onOpenChange,
}: {
  task: TaskDetail;
  project: Project;
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const [toId, setToId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const items = project.members
    // A viewer only reads: they can't be handed a task.
    .filter((member) => member.status === "active" && member.role !== "viewer" && !task.assigneeIds.includes(member.id))
    .map((member) => ({ value: member.id, label: member.name }));

  const delegate = useMutation(
    orpc.delegation.delegate.mutationOptions({
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.delegation_failed() });
        setErrors(failure.fields);
        if (failure.message) toast.add({ title: failure.message, type: "error" });
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.delegation.key() }),
        ]),
    }),
  );

  const submit = () => {
    if (!toId) return setErrors({ toId: m.delegation_error_person_required() });
    delegate.mutate({ projectId: project.id, taskId: task.id, toId, note: note.trim() || undefined });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Emptied once it has finished closing, so the next hand-off starts blank without the form clearing on the way out.
      onOpenChangeComplete={(next) => {
        if (!next) {
          setToId(null);
          setNote("");
          setErrors({});
        }
      }}
    >
      <DialogContent>
        <form
          noValidate
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.delegation_dialog_title({ code })}</DialogTitle>
            <DialogDescription>{m.delegation_dialog_description()}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!errors.toId || undefined}>
            <FieldLabel htmlFor={`${id}-to`}>{m.delegation_to_label()}</FieldLabel>
            <Select items={items} value={toId} onValueChange={(value) => setToId(value ? String(value) : null)}>
              <SelectTrigger id={`${id}-to`} className="w-full" aria-invalid={!!errors.toId}>
                <SelectValue placeholder={m.delegation_to_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.toId}</FieldError>
          </Field>
          <Field data-invalid={!!errors.note || undefined}>
            <FieldLabel htmlFor={`${id}-note`}>{m.delegation_note_label()}</FieldLabel>
            <Textarea
              id={`${id}-note`}
              rows={3}
              value={note}
              maxLength={DELEGATION_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={!!errors.note}
              aria-describedby={`${id}-note-hint`}
            />
            <FieldDescription id={`${id}-note-hint`}>{m.delegation_note_hint()}</FieldDescription>
            <FieldError>{errors.note}</FieldError>
          </Field>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={delegate.isPending}>
              {m.delegation_confirm()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
