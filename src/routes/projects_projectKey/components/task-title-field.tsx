import { useState, type KeyboardEvent } from "react";

import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { normalizePersianText } from "#/lib/persian-text";
import { TASK_TITLE_MAX_LENGTH } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Title =====*/

/** The task's title, saved when the field loses focus or on Enter. Escape puts the saved title back. */
export function TaskTitleField({
  task,
  update,
  readOnly,
}: {
  task: TaskDetail;
  update: ReturnType<typeof useTaskUpdate>;
  readOnly: boolean;
}) {
  const [draft, setDraft] = useState(task.title);
  const [error, setError] = useState<string>();

  const commit = () => {
    const title = normalizePersianText(draft);
    if (title === task.title) return setError(undefined);
    if (!title) return setError(m.task_error_title_required());
    if (title.length > TASK_TITLE_MAX_LENGTH)
      return setError(m.task_error_title_too_long({ max: TASK_TITLE_MAX_LENGTH }));
    setError(undefined);
    update.save({ title });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape" && draft !== task.title) {
      // Only undo the edit; a second Escape closes the drawer.
      event.stopPropagation();
      setDraft(task.title);
      setError(undefined);
    }
  };

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor="task-title">{m.task_title_label()}</FieldLabel>
      <Input
        id="task-title"
        value={draft}
        disabled={readOnly}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-invalid={!!error}
        autoComplete="off"
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
