import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldLabel } from "#/components/primitive/field/field";
import { RichText } from "#/components/primitive/rich-text/rich-text";
import { RichTextEditor } from "#/components/primitive/rich-text-editor/rich-text-editor";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { isEmptyRichText, type RichTextDoc } from "#/lib/rich-text";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import type { useTaskUpdate } from "#/routes/projects_projectKey/use-task-update";

/*===== Description =====*/

/**
 * The task's description, first in the work column under the title: read as rich text with no label over it (it is
 * plainly what the task is), and edited in the rich-text editor from the small pencil key beside it. A draft is saved
 * only with "Save" (or Ctrl+Enter), so half-written notes don't land in the history one keystroke at a time.
 */
export function TaskDescriptionField({
  task,
  update,
  readOnly,
}: {
  task: TaskDetail;
  update: ReturnType<typeof useTaskUpdate>;
  readOnly: boolean;
}) {
  const [draft, setDraft] = useState<RichTextDoc | null>(null);
  const editing = draft !== null;

  const save = async () => {
    if (!draft) return;
    await update.saveAsync({ description: isEmptyRichText(draft) ? null : draft });
    setDraft(null);
  };

  return (
    <Field>
      {/* Named for screen readers; on screen the text says what it is. */}
      <FieldLabel id="task-description-label" htmlFor={editing ? "task-description" : undefined} className="sr-only">
        {m.task_description_label()}
      </FieldLabel>

      {editing ? (
        <div className="flex flex-col gap-3">
          <RichTextEditor
            id="task-description"
            aria-labelledby="task-description-label"
            value={draft}
            onChange={setDraft}
            onSubmit={() => void save()}
            placeholder={m.task_description_placeholder()}
            // The person just pressed "Edit": the editor they opened takes the focus.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className="flex gap-3">
            <Button onClick={() => void save()} disabled={update.isPending}>
              {update.isPending && <Spinner data-icon="inline-start" />}
              {m.task_description_save()}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {m.task_description_cancel()}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {task.description ? (
              <RichText doc={task.description} />
            ) : (
              <p className="text-muted-foreground">{m.task_description_empty()}</p>
            )}
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.task_description_edit()}
              onClick={() => setDraft(task.description ?? { type: "doc" })}
            >
              <PencilIcon />
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}
