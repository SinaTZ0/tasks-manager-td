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
 * The task's description: read as rich text, edited in the rich-text editor on demand. A draft is saved only with
 * "Save" (or Ctrl+Enter), so half-written notes don't land in the history one keystroke at a time.
 */
export function TaskDescriptionField({ task, update }: { task: TaskDetail; update: ReturnType<typeof useTaskUpdate> }) {
  const [draft, setDraft] = useState<RichTextDoc | null>(null);
  const editing = draft !== null;

  const save = async () => {
    if (!draft) return;
    await update.saveAsync({ description: isEmptyRichText(draft) ? null : draft });
    setDraft(null);
  };

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel id="task-description-label" htmlFor={editing ? "task-description" : undefined}>
          {m.task_description_label()}
        </FieldLabel>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={() => setDraft(task.description ?? { type: "doc" })}>
            <PencilIcon data-icon="inline-start" />
            {m.task_description_edit()}
          </Button>
        )}
      </div>

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
      ) : task.description ? (
        <RichText doc={task.description} />
      ) : (
        <p className="text-muted-foreground">{m.task_description_empty()}</p>
      )}
    </Field>
  );
}
