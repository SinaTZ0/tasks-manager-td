import { PencilIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "#/components/primitive/button/button";
import { FieldError } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { SheetTitle } from "#/components/primitive/sheet/sheet";
import { normalizePersianText } from "#/lib/persian-text";
import { TASK_TITLE_MAX_LENGTH } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Title =====*/

/**
 * The task's title as the drawer's heading, edited in place: pressing the title (or its pencil key, or `e`) turns it
 * into a field holding the title. Enter or leaving the field saves it; Escape puts the saved title back. The heading
 * names the dialog, so it stays a heading while the title is read.
 */
export function TaskTitle({
  task,
  update,
  readOnly,
  editing,
  onEditingChange,
}: {
  task: TaskDetail;
  update: ReturnType<typeof useTaskUpdate>;
  readOnly: boolean;
  /** Kept by the drawer, so its `e` shortcut can open the field. */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState(task.title);
  const [error, setError] = useState<string>();

  const start = () => {
    setDraft(task.title);
    setError(undefined);
    onEditingChange(true);
  };

  const commit = () => {
    const title = normalizePersianText(draft);
    if (!title) return setError(m.task_error_title_required());
    if (title.length > TASK_TITLE_MAX_LENGTH)
      return setError(m.task_error_title_too_long({ max: TASK_TITLE_MAX_LENGTH }));
    if (title !== task.title) update.save({ title });
    onEditingChange(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      // Only leaves the field; a second Escape closes the drawer.
      event.stopPropagation();
      setError(undefined);
      onEditingChange(false);
    }
  };

  if (editing && !readOnly) {
    return (
      <div className="flex flex-col gap-1">
        {/* The dialog keeps its name while the heading is a field. */}
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <Input
          aria-label={m.task_title_label()}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-invalid={!!error}
          aria-describedby={error ? "task-title-error" : undefined}
          autoComplete="off"
          // The person just asked to edit the title: the field they opened takes the focus.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onFocus={(event) => event.target.select()}
        />
        <FieldError id="task-title-error">{error}</FieldError>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      {/* A press on the words opens the field for a pointer; the keyboard has the pencil key and `e`. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <SheetTitle size="page" onClick={readOnly ? undefined : start}>
        {task.title}
      </SheetTitle>
      {!readOnly && (
        <Button variant="ghost" size="icon-sm" aria-label={m.task_title_edit()} onClick={start}>
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}
