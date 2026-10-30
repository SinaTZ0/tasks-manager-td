import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, SendIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { FieldError } from "#/components/primitive/field/field";
import { Marking } from "#/components/primitive/marking/marking";
import { RichText } from "#/components/primitive/rich-text/rich-text";
import { RichTextEditor } from "#/components/primitive/rich-text-editor/rich-text-editor";
import { toast } from "#/components/primitive/toast/toast";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate } from "#/lib/locale";
import { isEmptyRichText, type RichTextDoc } from "#/lib/rich-text";
import { orpc } from "#/orpc/client";
import type { Comment } from "#/orpc/comment/contract";
import type { Project } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { useMentionPicker } from "#/routes/projects_projectKey/components/mention-picker";

/*===== Thread Query =====*/
const commentsQuery = ({ projectId, taskId }: { projectId: string; taskId: string }) =>
  orpc.comment.list.queryOptions({ input: { projectId, taskId } });

/** Refetches the thread and the history a comment change shows in. */
function useThreadChanged() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.comment.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
    ]);
}

/** The first message of a failed comment save: the field's, the form's, or the fallback. */
function failureText({ error, fallback }: { error: unknown; fallback: string }) {
  const failure = describeApiFailure({ error, fallback });
  return Object.values(failure.fields)[0] ?? failure.message ?? fallback;
}

/*===== Task Comments =====*/

/**
 * The drawer's thread (docs/app.md → Comments): every comment oldest first, each signed and dated, with keys to edit or
 * delete the viewer's own; a deleted one leaves a line saying so. Under it, the editor to write one: `@` mentions a
 * member, who is told, and Ctrl+Enter sends it. An archived task's thread is read-only.
 */
export function TaskComments({ task, project, viewerId }: { task: TaskDetail; project: Project; viewerId: string }) {
  const { data: comments, isPending } = useQuery(commentsQuery({ projectId: project.id, taskId: task.id }));
  const archived = task.archivedAt !== null;

  return (
    <section aria-label={m.comment_title()} className="flex flex-col gap-6">
      {/*------ Thread ------*/}
      {comments && comments.length > 0 ? (
        <ol className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              project={project}
              canChange={comment.authorId === viewerId && !comment.deleted && !archived}
            />
          ))}
        </ol>
      ) : (
        !isPending && <p className="text-body-sm text-muted-foreground">{m.comment_empty()}</p>
      )}

      {/*------ New Comment ------*/}
      {!archived && <CommentComposer task={task} project={project} />}
    </section>
  );
}

/*===== Comment =====*/

function CommentItem({ comment, project, canChange }: { comment: Comment; project: Project; canChange: boolean }) {
  const [editing, setEditing] = useState(false);
  const changed = useThreadChanged();
  const remove = useMutation(
    orpc.comment.remove.mutationOptions({
      onSettled: changed,
      onError: (error) =>
        toast.add({ title: failureText({ error, fallback: m.comment_delete_failed() }), type: "error" }),
    }),
  );
  const date = formatDate(comment.createdAt, { dateStyle: "medium", timeStyle: "short" });

  return (
    <li className="flex gap-3">
      <PersonAvatar name={comment.authorName} src={comment.authorAvatarUrl} decorative />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/*------ Signature ------*/}
        <div className="flex items-center gap-3">
          <span className="text-body-sm font-semibold">{comment.authorName}</span>
          <span className="text-caption text-muted-foreground">{date}</span>
          {comment.editedAt && !comment.deleted && <Marking>{m.comment_edited()}</Marking>}
          {canChange && !editing && (
            <span className="ms-auto flex gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={m.comment_edit({ date })}
                onClick={() => setEditing(true)}
              >
                <PencilIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={m.comment_delete({ date })}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ projectId: project.id, commentId: comment.id })}
              >
                <Trash2Icon />
              </Button>
            </span>
          )}
        </div>

        {/*------ Body ------*/}
        {comment.deleted || !comment.body ? (
          <p className="text-body-sm text-muted-foreground italic">{m.comment_deleted()}</p>
        ) : editing ? (
          <CommentEditForm comment={comment} body={comment.body} project={project} onDone={() => setEditing(false)} />
        ) : (
          <RichText doc={comment.body} />
        )}
      </div>
    </li>
  );
}

/*===== Edit =====*/

function CommentEditForm({
  comment,
  body,
  project,
  onDone,
}: {
  comment: Comment;
  body: RichTextDoc;
  project: Project;
  onDone: () => void;
}) {
  const [doc, setDoc] = useState<RichTextDoc>(body);
  const [error, setError] = useState<string>();
  const changed = useThreadChanged();
  const { mention, picker } = useMentionPicker(project.members);
  const edit = useMutation(
    orpc.comment.edit.mutationOptions({
      onSuccess: onDone,
      onError: (failure) => setError(failureText({ error: failure, fallback: m.comment_save_failed() })),
      onSettled: changed,
    }),
  );
  const save = () => {
    if (isEmptyRichText(doc)) return setError(m.comment_error_required());
    edit.mutate({ projectId: project.id, commentId: comment.id, body: doc });
  };

  return (
    <div className="flex flex-col gap-3">
      <RichTextEditor
        value={doc}
        onChange={(next) => {
          setDoc(next);
          setError(undefined);
        }}
        mention={mention}
        onSubmit={save}
        // The person just pressed "Edit": the editor they opened takes the focus.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        aria-label={m.comment_edit_label()}
        aria-invalid={!!error}
      />
      {picker}
      <FieldError>{error}</FieldError>
      <div className="flex gap-3">
        <Button size="sm" disabled={edit.isPending} onClick={save}>
          {m.comment_save()}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          {m.comment_cancel()}
        </Button>
      </div>
    </div>
  );
}

/*===== Composer =====*/

function CommentComposer({ task, project }: { task: TaskDetail; project: Project }) {
  const id = useId();
  const [doc, setDoc] = useState<RichTextDoc | null>(null);
  const [error, setError] = useState<string>();
  const changed = useThreadChanged();
  const { mention, picker } = useMentionPicker(project.members);
  const add = useMutation(
    orpc.comment.add.mutationOptions({
      onSuccess: () => {
        setDoc(null);
        setError(undefined);
      },
      onError: (failure) => setError(failureText({ error: failure, fallback: m.comment_save_failed() })),
      onSettled: changed,
    }),
  );
  const send = () => {
    if (isEmptyRichText(doc)) return setError(m.comment_error_required());
    add.mutate({ projectId: project.id, taskId: task.id, body: doc });
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-body-sm font-semibold">
        {m.comment_new_label()}
      </label>
      <RichTextEditor
        id={id}
        value={doc}
        onChange={(next) => {
          setDoc(next);
          setError(undefined);
        }}
        mention={mention}
        onSubmit={send}
        placeholder={m.comment_placeholder()}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
      />
      {picker}
      <FieldError>{error}</FieldError>
      <div className="flex items-center justify-between gap-4">
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {m.comment_hint()}
        </p>
        <Button size="sm" disabled={add.isPending} onClick={send}>
          <SendIcon data-icon="inline-start" className="rtl:-scale-x-100" />
          {m.comment_send()}
        </Button>
      </div>
    </div>
  );
}
