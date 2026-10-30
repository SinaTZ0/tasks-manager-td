import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { columnKindTitle } from "#/lib/column-title";
import { orpc } from "#/orpc/client";
import { COLUMN_KINDS, type ColumnKind } from "#/orpc/project/constants";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Transfer Dialog =====*/

export type TransferMode = "move" | "copy";

/** What the dialog acts on: a card, the column kind it is in, and whether it moves or is copied. */
export type TransferRequest = { taskId: string; code: string; kind: ColumnKind; mode: TransferMode };

/**
 * Moves a card to another project, or copies it there (docs/task-manager-plan.md → slice 20; admins only): pick the
 * project and the kind of column, the card's own kind by default. A copy can't start in the cancelled column. A move
 * that leaves its owner or assignee behind is refused, and the message names them. `onMoved` runs after a move, so
 * the drawer can close on a card that left the board.
 */
export function TransferDialog({
  projectId,
  request,
  open,
  onOpenChange,
  onMoved,
  finalFocus,
}: {
  projectId: string;
  request: TransferRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
  finalFocus?: () => HTMLElement | boolean;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const { mode } = request;
  const defaultKind: ColumnKind = mode === "copy" && request.kind === "cancelled" ? "backlog" : request.kind;
  const [targetId, setTargetId] = useState<string | null>(null);
  const [kind, setKind] = useState<ColumnKind>(defaultKind);
  const [failure, setFailure] = useState<{ message?: string; fields: Record<string, string> }>({ fields: {} });

  const { data: projects = [] } = useQuery({ ...orpc.project.list.queryOptions(), enabled: open });
  const targets = projects.filter((project) => project.id !== projectId);
  const projectItems = targets.map((project) => ({ value: project.id, label: `${project.name} (${project.key})` }));
  const kindItems = COLUMN_KINDS.filter((item) => mode === "move" || item !== "cancelled").map((item) => ({
    value: item,
    label: columnKindTitle(item),
  }));

  const options = {
    onSuccess: (placed: { projectKey: string; number: number }) => {
      const code = taskCode({ key: placed.projectKey, number: placed.number });
      toast.add({ title: mode === "move" ? m.transfer_moved({ code }) : m.transfer_copied({ code }), type: "success" });
      onOpenChange(false);
      if (mode === "move") onMoved?.();
    },
    onError: (error: unknown) => {
      const described = describeApiFailure({ error, fallback: m.transfer_failed() });
      setFailure({ message: described.message ?? undefined, fields: described.fields });
    },
    // Both boards, both histories, and the projects' card counts change.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.project.key() }),
      ]),
  };
  const move = useMutation(orpc.transfer.move.mutationOptions(options));
  const copy = useMutation(orpc.transfer.copy.mutationOptions(options));
  const pending = move.isPending || copy.isPending;

  const submit = () => {
    if (!targetId) return setFailure({ fields: { targetProjectId: m.transfer_error_project() } });
    const input = { projectId, taskId: request.taskId, targetProjectId: targetId, columnKind: kind };
    if (mode === "move") move.mutate(input);
    else copy.mutate(input);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Emptied once it has finished closing, so the next one starts blank without the form clearing on the way out.
      onOpenChangeComplete={(next) => {
        if (!next) {
          setTargetId(null);
          setKind(defaultKind);
          setFailure({ fields: {} });
        }
      }}
    >
      <DialogContent finalFocus={finalFocus}>
        <form
          noValidate
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "move" ? m.transfer_move_title() : m.transfer_copy_title()}{" "}
              <bdi className="font-mono">{request.code}</bdi>
            </DialogTitle>
            <DialogDescription>
              {mode === "move" ? m.transfer_move_description() : m.transfer_copy_description()}
            </DialogDescription>
          </DialogHeader>
          <FormAlert message={failure.message} />

          {/*------ Project ------*/}
          <Field data-invalid={!!failure.fields.targetProjectId || undefined}>
            <FieldLabel htmlFor={`${id}-project`}>{m.transfer_project()}</FieldLabel>
            <Select
              items={projectItems}
              value={targetId}
              onValueChange={(value) => setTargetId(value ? String(value) : null)}
            >
              <SelectTrigger id={`${id}-project`} className="w-full" aria-invalid={!!failure.fields.targetProjectId}>
                <SelectValue placeholder={m.transfer_error_project()} />
              </SelectTrigger>
              <SelectContent>
                {projectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{failure.fields.targetProjectId}</FieldError>
          </Field>

          {/*------ Column ------*/}
          <Field data-invalid={!!failure.fields.columnKind || undefined}>
            <FieldLabel htmlFor={`${id}-column`}>{m.transfer_column()}</FieldLabel>
            <Select items={kindItems} value={kind} onValueChange={(value) => value && setKind(value as ColumnKind)}>
              <SelectTrigger id={`${id}-column`} className="w-full" aria-invalid={!!failure.fields.columnKind}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{failure.fields.columnKind}</FieldError>
          </Field>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {mode === "move" ? m.transfer_confirm_move() : m.transfer_confirm_copy()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
