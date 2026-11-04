import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TagsIcon, Trash2Icon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useController, useForm, useWatch, type Control } from "react-hook-form";
import { z } from "zod";

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
import { SaveBar } from "#/components/shared/save-bar/save-bar";
import { describeApiFailure } from "#/lib/api-error";
import { normalizePersianText, persianText } from "#/lib/persian-text";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import { LABEL_COLORS, LABEL_NAME_MAX_LENGTH, type LabelColor } from "#/orpc/task/constants";
import type { Label, TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { LABEL_SWATCH, labelColorName } from "#/routes/projects_projectKey/task-text";

/*===== Form =====*/

const labelsFormSchema = z.object({
  labels: z.record(
    z.string(),
    z.object({
      name: persianText()
        .min(1, { error: () => m.label_error_name_required() })
        .max(LABEL_NAME_MAX_LENGTH, { error: () => m.label_error_name_too_long({ max: LABEL_NAME_MAX_LENGTH }) }),
      color: z.enum(LABEL_COLORS),
    }),
  ),
});

type LabelsFormValues = z.infer<typeof labelsFormSchema>;

const valuesOf = (labels: Label[]): LabelsFormValues => ({
  labels: Object.fromEntries(labels.map((label) => [label.id, { name: label.name, color: label.color }])),
});

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.label_dialog_title()}</DialogTitle>
          <DialogDescription>
            {isAdmin ? m.label_dialog_description_admin() : m.label_dialog_description_member()}
          </DialogDescription>
        </DialogHeader>

        {isAdmin ? (
          <LabelsEditor projectId={projectId} labels={labels} usage={usage} />
        ) : (
          <>
            {labels.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{m.label_empty()}</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {labels.map((label) => (
                  <li key={label.id} className="flex items-center justify-between gap-3">
                    <LabelTag label={label} />
                    <UsageCount count={usage.get(label.id) ?? 0} />
                  </li>
                ))}
              </ul>
            )}
            <NewLabelForm projectId={projectId} />
            <DialogFooter showCloseButton />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UsageCount({ count }: { count: number }) {
  // A set width, so the colour keys line up down the rows whatever the count.
  return (
    <span className="min-w-16 shrink-0 text-caption whitespace-nowrap text-muted-foreground">
      {m.label_used_by({ count })}
    </span>
  );
}

/*===== Editor =====*/

/**
 * An admin's view: every label a row in one form with one Save, its colours laid out beside its name. Each changed label
 * is saved on its own, so a name already taken stays marked on its row while the others go through. Rows are keyed by
 * label id, so a label added or deleted doesn't shift the edits onto its neighbours.
 */
function LabelsEditor({
  projectId,
  labels,
  usage,
}: {
  projectId: string;
  labels: Label[];
  usage: Map<string, number>;
}) {
  const queryClient = useQueryClient();
  const formId = useId();
  const form = useForm<LabelsFormValues>({
    resolver: zodResolver(labelsFormSchema),
    values: valuesOf(labels),
    // A refetch (after a save, or someone else's change) must leave unsaved edits and a failed row's error alone.
    resetOptions: { keepDirtyValues: true, keepErrors: true },
  });
  const { isSubmitting } = form.formState;
  // Compared with the saved labels rather than read from `dirtyFields`: the form changes that object in place, so the
  // React Compiler would keep a stale answer.
  const rows = useWatch({ control: form.control, name: "labels" });
  const changed = labels.filter((label) => {
    const row = rows[label.id];
    return row && (row.name !== label.name || row.color !== label.color);
  });
  const update = useMutation(orpc.task.updateLabel.mutationOptions());

  /** Saves one label; on a failure it marks the row and says whether it went through. */
  const saveLabel = async ({ label, values }: { label: Label; values: LabelsFormValues }) => {
    const row = values.labels[label.id];
    if (!row) return true;
    try {
      const saved = await update.mutateAsync({ projectId, labelId: label.id, name: row.name, color: row.color });
      form.resetField(`labels.${label.id}.name`, { defaultValue: saved.name });
      form.resetField(`labels.${label.id}.color`, { defaultValue: saved.color });
      return true;
    } catch (error) {
      const failure = describeApiFailure({ error, fallback: m.label_save_failed() });
      form.setError(`labels.${label.id}.name`, {
        message: failure.fields.name ?? failure.message ?? m.label_save_failed(),
      });
      return false;
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await Promise.all(changed.map((label) => saveLabel({ label, values })));
    await queryClient.invalidateQueries({ queryKey: orpc.task.board.key() });
    if (saved.every(Boolean)) toast.add({ title: m.label_saved(), type: "success" });
  });

  return (
    <>
      {labels.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{m.label_empty()}</p>
      ) : (
        <form id={formId} onSubmit={onSubmit} noValidate>
          <ul className="flex flex-col gap-3">
            {labels.map((label) => (
              <LabelRow
                key={label.id}
                projectId={projectId}
                label={label}
                count={usage.get(label.id) ?? 0}
                control={form.control}
              />
            ))}
          </ul>
        </form>
      )}
      <NewLabelForm projectId={projectId} />
      {labels.length > 0 && (
        <SaveBar
          form={formId}
          count={changed.length}
          saving={isSubmitting}
          // `resetOptions` above applies to every reset, and this one must drop the edits.
          onDiscard={() => form.reset(valuesOf(labels), { keepDirtyValues: false, keepErrors: false })}
        />
      )}
    </>
  );
}

/*===== Label Row =====*/

/**
 * One label for an admin: its name, its colour keys, how many tasks have it, and a delete that asks first. Its fields go
 * through `useController`, not `register`: the React Compiler would memoize `register`'s props and a form error read
 * from `errors`, which the form changes in place.
 */
function LabelRow({
  projectId,
  label,
  count,
  control,
}: {
  projectId: string;
  label: Label;
  count: number;
  control: Control<LabelsFormValues>;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const { field: name, fieldState } = useController({ control, name: `labels.${label.id}.name` });
  const { field: color } = useController({ control, name: `labels.${label.id}.color` });

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

  /*------ Confirm Delete ------*/
  if (confirming) {
    return (
      <li className="flex flex-col gap-3">
        <p className="text-body-sm">{m.label_delete_confirm({ name: label.name })}</p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ projectId, labelId: label.id })}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {m.label_delete_submit()}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={remove.isPending}
            onClick={() => setConfirming(false)}
          >
            {m.label_delete_cancel()}
          </Button>
        </div>
      </li>
    );
  }

  /*------ Edit ------*/
  return (
    <li>
      <Field data-invalid={fieldState.invalid || undefined}>
        <div className="flex items-center gap-3">
          <Input
            aria-label={m.label_name()}
            className="min-w-0 flex-1"
            aria-invalid={fieldState.invalid}
            autoComplete="off"
            {...name}
          />
          <ColorKeys value={color.value} onChange={color.onChange} />
          <UsageCount count={count} />
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
        <FieldError>{fieldState.error?.message}</FieldError>
      </Field>
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
        <div className="flex items-center gap-3">
          <Input
            id={id}
            className="min-w-0 flex-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!error}
            autoComplete="off"
          />
          <ColorKeys value={color} onChange={setColor} />
          <Button type="submit" variant="secondary" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.label_add()}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </Field>
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
