import { useId } from "react";

import { Checkbox } from "#/components/primitive/checkbox/checkbox";
import { Field, FieldLabel, FieldLegend, FieldSet } from "#/components/primitive/field/field";
import type { Label, TaskCard, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { LabelTag } from "#/routes/projects_projectKey/components/label-tag";
import { LabelsDialog } from "#/routes/projects_projectKey/components/labels-dialog";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Labels =====*/

/**
 * The task's labels: a check key per label of the project, saved as soon as it is pressed. Adding, renaming and
 * deleting labels happens in the labels dialog, opened from the key under them.
 */
export function LabelPicker({
  task,
  update,
  projectId,
  labels,
  tasks,
  isAdmin,
  readOnly,
}: {
  task: TaskDetail;
  update: ReturnType<typeof useTaskUpdate>;
  projectId: string;
  labels: Label[];
  /** The board's live tasks, for how many have each label. */
  tasks: TaskCard[];
  isAdmin: boolean;
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
      {!readOnly && <LabelsDialog projectId={projectId} labels={labels} tasks={tasks} isAdmin={isAdmin} />}
    </FieldSet>
  );
}
