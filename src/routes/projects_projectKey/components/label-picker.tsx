import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";

import { Button } from "#/components/primitive/button/button";
import { Checkbox } from "#/components/primitive/checkbox/checkbox";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { ToggleGroup, ToggleGroupItem } from "#/components/primitive/toggle-group/toggle-group";
import { describeApiFailure } from "#/lib/api-error";
import { normalizePersianText } from "#/lib/persian-text";
import { cn } from "#/lib/utils";
import { orpc } from "#/orpc/client";
import { LABEL_COLORS, LABEL_NAME_MAX_LENGTH, type LabelColor } from "#/orpc/task/constants";
import type { Label, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { LABEL_SWATCH, labelColorName } from "#/routes/projects_projectKey/task-text";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Labels =====*/

/**
 * The task's labels: a check key per label of the project, saved as soon as it is pressed, and a small form under them
 * that adds a label to the project and puts it on this task.
 */
export function LabelPicker({
  task,
  update,
  projectId,
  labels,
  readOnly,
}: {
  task: TaskDetail;
  update: ReturnType<typeof useTaskUpdate>;
  projectId: string;
  labels: Label[];
  /** A viewer sees which labels are ticked, and makes none. */
  readOnly: boolean;
}) {
  const baseId = useId();
  const toggle = (labelId: string, on: boolean) =>
    update.save({ labelIds: on ? [...task.labelIds, labelId] : task.labelIds.filter((id) => id !== labelId) });

  return (
    <FieldSet>
      <FieldLegend variant="label">{m.task_labels()}</FieldLegend>
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-3">
          {labels.map((label) => {
            const id = `${baseId}-${label.id}`;
            return (
              <li key={label.id}>
                <Field orientation="horizontal">
                  <Checkbox
                    id={id}
                    checked={task.labelIds.includes(label.id)}
                    disabled={readOnly}
                    onCheckedChange={(checked) => toggle(label.id, checked)}
                  />
                  <FieldLabel htmlFor={id}>
                    <LabelTag label={label} />
                  </FieldLabel>
                </Field>
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly && <NewLabelForm projectId={projectId} onCreated={(label) => toggle(label.id, true)} />}
    </FieldSet>
  );
}

/*===== New Label =====*/
function NewLabelForm({ projectId, onCreated }: { projectId: string; onCreated: (label: Label) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0]);
  const [error, setError] = useState<string>();
  const id = useId();

  const create = useMutation(
    orpc.task.createLabel.mutationOptions({
      onSuccess: async (label) => {
        setName("");
        await queryClient.invalidateQueries({ queryKey: orpc.task.board.key() });
        onCreated(label);
      },
      onError: (failure) => {
        const described = describeApiFailure({ error: failure, fallback: m.task_save_failed() });
        setError(described.fields.name ?? described.message ?? m.task_save_failed());
      },
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = normalizePersianText(name);
    if (!clean) return setError(m.label_error_name_required());
    if (clean.length > LABEL_NAME_MAX_LENGTH)
      return setError(m.label_error_name_too_long({ max: LABEL_NAME_MAX_LENGTH }));
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
      <ToggleGroup
        aria-label={m.label_color()}
        size="sm"
        value={[color]}
        onValueChange={(next) => {
          // A colour is always chosen: pressing the latched key again reports an empty array.
          if (next[0]) setColor(next[0] as LabelColor);
        }}
      >
        {LABEL_COLORS.map((value) => (
          <ToggleGroupItem key={value} value={value} aria-label={labelColorName(value)}>
            <span aria-hidden="true" className={cn("size-3 rounded-xs", LABEL_SWATCH[value])} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </form>
  );
}
