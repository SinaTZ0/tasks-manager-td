import { useState, type KeyboardEvent } from "react";

import { DatePicker } from "#/components/primitive/date-picker/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { formatDuration, parseDuration } from "#/lib/duration";
import { priorityName } from "#/lib/priority-name";
import type { Person } from "#/orpc/project/contract";
import { ESTIMATE_MAX_MINUTES, TASK_PRIORITIES, type TaskPriority } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Types =====*/
type Update = ReturnType<typeof useTaskUpdate>;

/** The select's value for "nobody", since a select item can't hold null. */
const NOBODY = "none";

/*===== Priority =====*/
export function PriorityField({ task, update }: { task: TaskDetail; update: Update }) {
  const items = TASK_PRIORITIES.map((value) => ({ value, label: priorityName(value) }));

  return (
    <Field>
      <FieldLabel htmlFor="task-priority">{m.task_priority_label()}</FieldLabel>
      <Select
        items={items}
        value={task.priority}
        onValueChange={(value) => value && value !== task.priority && update.save({ priority: value as TaskPriority })}
      >
        <SelectTrigger id="task-priority" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/*===== People =====*/

/**
 * Picks the assignee or the owner from the project's active members. Someone who has left stays shown as the current
 * value until it changes. The owner can only be handed over by the owner or an admin (rule 6), so for anyone else the
 * owner's select is read-only.
 */
export function PersonField({
  task,
  update,
  field,
  members,
  people,
  canEdit = true,
}: {
  task: TaskDetail;
  update: Update;
  field: "assignee" | "owner";
  members: Person[];
  people: Map<string, Person>;
  canEdit?: boolean;
}) {
  const current = field === "owner" ? task.ownerId : task.assigneeId;
  const choices = members.filter((member) => member.status === "active");
  const currentPerson = current ? people.get(current) : undefined;
  if (currentPerson && !choices.some((member) => member.id === currentPerson.id)) choices.push(currentPerson);

  const items = [
    ...(field === "assignee" ? [{ value: NOBODY, label: m.task_unassigned() }] : []),
    ...choices.map((person) => ({ value: person.id, label: person.name })),
  ];
  const id = `task-${field}`;

  const onChange = (value: string | null) => {
    if (!value || value === (current ?? NOBODY)) return;
    if (field === "owner") update.save({ ownerId: value });
    else update.save({ assigneeId: value === NOBODY ? null : value });
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>{field === "owner" ? m.task_owner_label() : m.task_assignee_label()}</FieldLabel>
      <Select items={items} value={current ?? NOBODY} onValueChange={onChange} disabled={!canEdit}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field === "owner" && !canEdit && <FieldDescription>{m.task_owner_locked()}</FieldDescription>}
    </Field>
  );
}

/*===== Due Date =====*/
export function DueDateField({ task, update }: { task: TaskDetail; update: Update }) {
  return (
    <Field>
      <FieldLabel htmlFor="task-due">{m.task_due_label()}</FieldLabel>
      <DatePicker
        id="task-due"
        value={task.dueDate}
        onChange={(dueDate) => dueDate !== task.dueDate && update.save({ dueDate })}
      />
    </Field>
  );
}

/*===== Estimate =====*/

/** The estimate, typed as `1:30`, `2` or `45m` and saved when the field loses focus or on Enter. */
export function EstimateField({ task, update }: { task: TaskDetail; update: Update }) {
  const saved = task.estimateMinutes === null ? "" : formatDuration(task.estimateMinutes);
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState<string>();

  const commit = () => {
    const minutes = parseDuration(draft);
    if (minutes === undefined || (minutes !== null && (minutes < 1 || minutes > ESTIMATE_MAX_MINUTES))) {
      return setError(m.task_error_estimate_invalid());
    }
    setError(undefined);
    if (minutes !== task.estimateMinutes) update.save({ estimateMinutes: minutes });
    setDraft(minutes === null ? "" : formatDuration(minutes));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor="task-estimate">{m.task_estimate_label()}</FieldLabel>
      <Input
        id="task-estimate"
        variant="code"
        dir="ltr"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-invalid={!!error}
        aria-describedby="task-estimate-hint"
      />
      <FieldDescription id="task-estimate-hint">{m.task_estimate_hint()}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
