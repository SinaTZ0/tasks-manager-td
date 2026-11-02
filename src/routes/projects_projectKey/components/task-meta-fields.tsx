import { useId, useState, type KeyboardEvent } from "react";

import { Checkbox } from "#/components/primitive/checkbox/checkbox";
import { DatePicker } from "#/components/primitive/date-picker/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { DueMark, dueState } from "#/components/shared/due-mark/due-mark";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { formatDuration, parseDuration } from "#/lib/duration";
import { priorityName } from "#/lib/priority-name";
import type { Person } from "#/orpc/project/contract";
import { ESTIMATE_MAX_MINUTES, TASK_PRIORITIES, type TaskPriority } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Types =====*/
type Update = ReturnType<typeof useTaskUpdate>;

/*===== Priority =====*/
export function PriorityField({ task, update, readOnly }: { task: TaskDetail; update: Update; readOnly: boolean }) {
  const items = TASK_PRIORITIES.map((value) => ({ value, label: priorityName(value) }));

  return (
    <Field orientation="row">
      <FieldLabel htmlFor="task-priority">{m.task_priority_label()}</FieldLabel>
      <Select
        items={items}
        value={task.priority}
        disabled={readOnly}
        onValueChange={(value) => value && value !== task.priority && update.save({ priority: value as TaskPriority })}
      >
        <SelectTrigger id="task-priority" variant="quiet" size="sm" className="w-full">
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

/** The project's active editors (a viewer only reads), with anyone in `keep` who has left since, so they still show. */
function choicesOf({ members, people, keep }: { members: Person[]; people: Map<string, Person>; keep: string[] }) {
  const choices = members.filter((member) => member.status === "active" && member.role !== "viewer");
  for (const id of keep) {
    const person = people.get(id);
    if (person && !choices.some((member) => member.id === id)) choices.push(person);
  }
  return choices;
}

/**
 * The task's assignees: a check key per active editor of the project, each with their cap, saved as soon as it is
 * pressed. Several people may do one task; the owner may be one of them. Someone who has left stays listed while they
 * are on it, so they can be taken off.
 */
export function AssigneesField({
  task,
  update,
  members,
  people,
  canEdit,
}: {
  task: TaskDetail;
  update: Update;
  members: Person[];
  people: Map<string, Person>;
  canEdit: boolean;
}) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const choices = choicesOf({ members, people, keep: task.assigneeIds });
  const toggle = (userId: string, on: boolean) =>
    update.save({
      assigneeIds: on ? [...task.assigneeIds, userId] : task.assigneeIds.filter((id) => id !== userId),
    });

  return (
    <Field orientation="row" aria-labelledby={labelId}>
      {/* Names the group; each person's key has its own label. */}
      <FieldLabel id={labelId} className="self-start">
        {m.task_assignee_label()}
      </FieldLabel>
      <ul className="flex flex-col gap-2.5">
        {choices.map((person) => {
          const id = `${baseId}-${person.id}`;
          return (
            <li key={person.id}>
              <Field orientation="horizontal">
                <Checkbox
                  id={id}
                  checked={task.assigneeIds.includes(person.id)}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => toggle(person.id, checked)}
                />
                <FieldLabel htmlFor={id}>
                  <PersonAvatar name={person.name} src={person.avatarUrl} decorative />
                  {person.name}
                </FieldLabel>
              </Field>
            </li>
          );
        })}
      </ul>
    </Field>
  );
}

/**
 * Picks the owner from the project's active editors. Someone who has left stays shown as the current value until it
 * changes. The owner can only be handed over by the owner or an admin (rule 6), so for anyone else the select is
 * read-only.
 */
export function OwnerField({
  task,
  update,
  members,
  people,
  canEdit,
  explainLock,
}: {
  task: TaskDetail;
  update: Update;
  members: Person[];
  people: Map<string, Person>;
  canEdit: boolean;
  /** Say why a locked owner can't be changed; not for a viewer, who changes nothing anyway. */
  explainLock: boolean;
}) {
  const items = choicesOf({ members, people, keep: [task.ownerId] }).map((person) => ({
    value: person.id,
    label: person.name,
  }));
  const id = "task-owner";

  const onChange = (value: string | null) => {
    if (value && value !== task.ownerId) update.save({ ownerId: value });
  };

  return (
    <Field orientation="row">
      <FieldLabel htmlFor={id}>{m.task_owner_label()}</FieldLabel>
      <Select items={items} value={task.ownerId} onValueChange={onChange} disabled={!canEdit}>
        <SelectTrigger id={id} variant="quiet" size="sm" className="w-full">
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
      {!canEdit && explainLock && <FieldDescription>{m.task_owner_locked()}</FieldDescription>}
    </Field>
  );
}

/*===== Due Date =====*/
export function DueDateField({
  task,
  update,
  readOnly,
  finished,
}: {
  task: TaskDetail;
  update: Update;
  readOnly: boolean;
  /** Done or cancelled: the date no longer warns. */
  finished: boolean;
}) {
  const tone = task.dueDate ? dueState({ dueDate: task.dueDate, finished }).tone : null;

  return (
    <Field orientation="row">
      <FieldLabel htmlFor="task-due">{m.task_due_label()}</FieldLabel>
      <DatePicker
        quiet
        id="task-due"
        value={task.dueDate}
        disabled={readOnly}
        onChange={(dueDate) => dueDate !== task.dueDate && update.save({ dueDate })}
      />
      {/* Only once it comes close, and only the words: the picker already prints the date. */}
      {task.dueDate && tone && (
        <FieldDescription>
          <DueMark dueDate={task.dueDate} finished={finished} format={{ dateStyle: "medium" }} brief />
        </FieldDescription>
      )}
    </Field>
  );
}

/*===== Estimate =====*/

/** The estimate, typed as `1:30`, `2` or `45m` and saved when the field loses focus or on Enter. */
export function EstimateField({ task, update, readOnly }: { task: TaskDetail; update: Update; readOnly: boolean }) {
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
    <Field orientation="row" data-invalid={!!error || undefined}>
      <FieldLabel htmlFor="task-estimate">{m.task_estimate_label()}</FieldLabel>
      <Input
        quiet
        id="task-estimate"
        placeholder={m.task_estimate_none()}
        variant="code"
        dir="ltr"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        disabled={readOnly}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-invalid={!!error}
        aria-describedby={readOnly ? undefined : "task-estimate-hint"}
      />
      {/* Only while typing: the hint is for writing a duration, not for reading one. */}
      {!readOnly && (
        <FieldDescription id="task-estimate-hint" className="hidden group-focus-within/field:block">
          {m.task_estimate_hint()}
        </FieldDescription>
      )}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
