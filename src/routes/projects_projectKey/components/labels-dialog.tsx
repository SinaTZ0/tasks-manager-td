import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TagsIcon, Trash2Icon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/primitive/dialog/dialog";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { ToggleGroup, ToggleGroupItem } from "#/components/primitive/toggle-group/toggle-group";
import { describeApiFailure } from "#/lib/api-error";
import { normalizePersianText } from "#/lib/persian-text";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import { LABEL_COLORS, LABEL_NAME_MAX_LENGTH, type LabelColor } from "#/orpc/task/constants";
import type { Label, TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { LABEL_SWATCH, labelColorName } from "#/routes/projects_projectKey/task-text";

/*===== Labels Dialog =====*/

/**
 * The project's labels, opened from the drawer's label picker. Any member adds a label here; only an admin renames,
 * recolours or deletes one, since that changes every task that has it (the procedures check again). The counts are of
 * the board's live tasks: a delete also takes the label off archived ones.
 */
export function LabelsDialog({
  projectId,
  labels,
  tasks,
  isAdmin,
}: {
  projectId: string;
  labels: Label[];
  tasks: TaskCard[];
  isAdmin: boolean;
}) {
  const usage = new Map<string, number>();
  for (const task of tasks) for (const id of task.labelIds) usage.set(id, (usage.get(id) ?? 0) + 1);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="xs" className="self-start" />}>
        <TagsIcon data-icon="inline-start" />
        {m.label_manage()}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.label_dialog_title()}</DialogTitle>
          <DialogDescription>
            {isAdmin ? m.label_dialog_description_admin() : m.label_dialog_description_member()}
          </DialogDescription>
        </DialogHeader>

        {/*===== List =====*/}
        {labels.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{m.label_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {labels.map((label) =>
              isAdmin ? (
                // Keyed on the saved values too, so a saved or refreshed label starts its row again from them.
                <LabelRow
                  key={`${label.id}-${label.name}-${label.color}`}
                  projectId={projectId}
                  label={label}
                  count={usage.get(label.id) ?? 0}
                />
              ) : (
                <li key={label.id} className="flex items-center justify-between gap-3">
                  <LabelTag label={label} />
                  <UsageCount count={usage.get(label.id) ?? 0} />
                </li>
              ),
            )}
          </ul>
        )}

        {/*===== New =====*/}
        <NewLabelForm projectId={projectId} />

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function UsageCount({ count }: { count: number }) {
  return <span className="shrink-0 text-caption text-muted-foreground">{m.label_used_by({ count })}</span>;
}

/*===== Label Row =====*/

/** One label for an admin: its name and colour, saved together, and a delete that asks first. */
function LabelRow({ projectId, label, count }: { projectId: string; label: Label; count: number }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<LabelColor>(label.color);
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const id = useId();
  const dirty = name !== label.name || color !== label.color;

  const update = useMutation(
    orpc.task.updateLabel.mutationOptions({
      onSuccess: async () => {
        toast.add({ title: m.label_saved(), type: "success" });
        await queryClient.invalidateQueries({ queryKey: orpc.task.board.key() });
      },
      onError: (failure) => {
        const described = describeApiFailure({ error: failure, fallback: m.label_save_failed() });
        setError(described.fields.name ?? described.message ?? m.label_save_failed());
      },
    }),
  );

  const remove = useMutation(
    orpc.task.deleteLabel.mutationOptions({
      onSuccess: async () => {
        toast.add({ title: m.label_deleted({ name: label.name }), type: "success" });
        // The open card's own labels change too, not only the board's.
        await queryClient.invalidateQueries({ queryKey: orpc.task.key() });
      },
      onError: (failure) => {
        const described = describeApiFailure({ error: failure, fallback: m.label_save_failed() });
        toast.add({ title: described.message ?? m.label_save_failed(), type: "error" });
      },
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = normalizePersianText(name);
    const local = checkName(clean);
    if (local) return setError(local);
    setError(undefined);
    update.mutate({ projectId, labelId: label.id, name: clean, color });
  };

  /*------ Confirm Delete ------*/
  if (confirming) {
    return (
      <li className="flex flex-col gap-3">
        <p className="text-body-sm">{m.label_delete_confirm({ name: label.name })}</p>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ projectId, labelId: label.id })}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {m.label_delete_submit()}
          </Button>
          <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => setConfirming(false)}>
            {m.label_delete_cancel()}
          </Button>
        </div>
      </li>
    );
  }

  /*------ Edit ------*/
  return (
    <li>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <Field data-invalid={!!error || undefined}>
          <div className="flex gap-3">
            <Input
              id={id}
              aria-label={m.label_name()}
              className="flex-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!error}
              autoComplete="off"
            />
            <Button type="submit" variant="secondary" disabled={!dirty || update.isPending}>
              {update.isPending && <Spinner data-icon="inline-start" />}
              {m.label_save()}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={m.label_delete({ name: label.name })}
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon />
            </Button>
          </div>
          <FieldError>{error}</FieldError>
        </Field>
        <div className="flex items-center justify-between gap-3">
          <ColorKeys value={color} onChange={setColor} />
          <UsageCount count={count} />
        </div>
      </form>
    </li>
  );
}

/*===== New Label =====*/
function NewLabelForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0]);
  const [error, setError] = useState<string>();
  const id = useId();

  const create = useMutation(
    orpc.task.createLabel.mutationOptions({
      onSuccess: async () => {
        setName("");
        await queryClient.invalidateQueries({ queryKey: orpc.task.board.key() });
      },
      onError: (failure) => {
        const described = describeApiFailure({ error: failure, fallback: m.label_save_failed() });
        setError(described.fields.name ?? described.message ?? m.label_save_failed());
      },
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = normalizePersianText(name);
    const local = checkName(clean);
    if (local) return setError(local);
    setError(undefined);
    create.mutate({ projectId, name: clean, color });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={id}>{m.label_new_label()}</FieldLabel>
        <div className="flex gap-3">
          <Input
            id={id}
            className="flex-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!error}
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.label_add()}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </Field>
      <ColorKeys value={color} onChange={setColor} />
    </form>
  );
}

/*===== Shared Parts =====*/

/** The same checks as the API's, so the common mistakes are caught before a round trip. */
function checkName(clean: string): string | undefined {
  if (!clean) return m.label_error_name_required();
  if (clean.length > LABEL_NAME_MAX_LENGTH) return m.label_error_name_too_long({ max: LABEL_NAME_MAX_LENGTH });
}

function ColorKeys({ value, onChange }: { value: LabelColor; onChange: (color: LabelColor) => void }) {
  return (
    <ToggleGroup
      aria-label={m.label_color()}
      size="sm"
      value={[value]}
      onValueChange={(next) => {
        // A colour is always chosen: pressing the latched key again reports an empty array.
        if (next[0]) onChange(next[0] as LabelColor);
      }}
    >
      {LABEL_COLORS.map((color) => (
        <ToggleGroupItem key={color} value={color} aria-label={labelColorName(color)}>
          <span aria-hidden="true" className={cn("size-3 rounded-xs", LABEL_SWATCH[color])} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
