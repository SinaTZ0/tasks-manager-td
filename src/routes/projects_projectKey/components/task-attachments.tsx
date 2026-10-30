import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileIcon, LinkIcon, PaperclipIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate } from "#/lib/locale";
import { ATTACHMENT_MAX_BYTES } from "#/orpc/attachment/constants";
import type { Attachment } from "#/orpc/attachment/contract";
import { client, orpc } from "#/orpc/client";
import type { Person } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { taskQuery } from "#/routes/projects_projectKey/queries";

/*===== Helpers =====*/

/** A file's size in the reader's language: bytes, then KB, then MB with one decimal. */
function sizeOf(bytes: number): string {
  if (bytes < 1024) return m.attachment_size_bytes({ size: bytes });
  if (bytes < 1024 * 1024) return m.attachment_size_kb({ size: Math.round(bytes / 1024) });
  return m.attachment_size_mb({ size: Math.round((bytes / 1024 / 1024) * 10) / 10 });
}

/** Refetches what an attachment change shows in: the drawer, the card's count and the history. */
function useAttachmentsChanged({ projectId, number }: { projectId: string; number: number }) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskQuery({ projectId, number }).queryKey }),
      queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
    ]);
}

function toastFailure(error: unknown) {
  const failure = describeApiFailure({ error, fallback: m.attachment_save_failed() });
  toast.add({
    title: Object.values(failure.fields)[0] ?? failure.message ?? m.attachment_save_failed(),
    type: "error",
  });
}

/*===== Upload =====*/

export type AttachmentUpload = {
  /** The files still on their way, by name. */
  pending: { id: string; name: string }[];
  /** Sends each file on its own; one that fails says why in a toast and leaves the others going. */
  upload: (files: File[]) => void;
};

/**
 * Uploads files to a card. The drawer owns it, so a file dropped or pasted anywhere on the card and one picked in the
 * attachments section show in the same list while they upload. A file over the limit is refused before it is sent.
 */
export function useAttachmentUpload({ projectId, task }: { projectId: string; task: TaskDetail }): AttachmentUpload {
  const changed = useAttachmentsChanged({ projectId, number: task.number });
  const [pending, setPending] = useState<AttachmentUpload["pending"]>([]);

  const upload = (files: File[]) => {
    for (const file of files) {
      if (file.size > ATTACHMENT_MAX_BYTES) {
        toast.add({ title: m.attachment_error_too_big({ max: ATTACHMENT_MAX_BYTES / 1024 / 1024 }), type: "error" });
        continue;
      }
      const id = crypto.randomUUID();
      setPending((list) => [...list, { id, name: file.name }]);
      client.attachment
        .addFile({ projectId, taskId: task.id, file })
        .catch(toastFailure)
        .finally(() => {
          setPending((list) => list.filter((item) => item.id !== id));
          void changed();
        });
    }
  };
  return { pending, upload };
}

/** Whether a drag carries files (and not text or a link being dragged around the page). */
const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/**
 * Props for the element files can be dropped on or pasted into: the whole drawer. A paste into a text field or an
 * editor stays text when the clipboard has text; only a paste of files alone (a screenshot) becomes an attachment.
 */
export function useAttachmentDrop({ upload, enabled }: { upload: AttachmentUpload["upload"]; enabled: boolean }) {
  const [over, setOver] = useState(false);
  if (!enabled) return { over: false, props: {} };
  return {
    over,
    props: {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setOver(true);
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        // Leaving for one of its own children isn't leaving.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setOver(false);
        upload([...event.dataTransfer.files]);
      },
      onPaste: (event: ClipboardEvent<HTMLElement>) => {
        const files = [...event.clipboardData.files];
        if (files.length === 0 || event.clipboardData.types.includes("text/plain")) return;
        event.preventDefault();
        upload(files);
      },
    },
  };
}

/*===== Task Attachments =====*/

/**
 * The card's files and links (docs/task-manager-plan.md → slice 15), oldest first: an image as its preview, opening
 * full size; any other file by its name, downloading; a link by its title and site. Files are picked here, dropped on
 * the card or pasted; a link is added with its address and an optional title. Whoever added one, or an admin, can
 * remove it. A viewer sees the list only.
 */
export function TaskAttachments({
  task,
  projectId,
  people,
  uploads,
  readOnly,
}: {
  task: TaskDetail;
  projectId: string;
  people: Map<string, Person>;
  uploads: AttachmentUpload;
  readOnly: boolean;
}) {
  const { viewerId, isAdmin } = useBoardAccess();
  const changed = useAttachmentsChanged({ projectId, number: task.number });
  const fileInput = useRef<HTMLInputElement>(null);
  const [linking, setLinking] = useState(false);
  const remove = useMutation(orpc.attachment.remove.mutationOptions({ onError: toastFailure, onSettled: changed }));
  const empty = task.attachments.length === 0 && uploads.pending.length === 0;

  return (
    <section aria-labelledby="task-attachments-title" className="flex flex-col gap-4">
      <h3 id="task-attachments-title" className="flex items-center gap-2 font-heading text-h4">
        <PaperclipIcon aria-hidden="true" className="size-4" />
        {m.attachment_title()}
      </h3>

      {/*------ List ------*/}
      {empty ? (
        <p className="text-body-sm text-muted-foreground">{m.attachment_empty()}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {task.attachments.map((item) => (
            <AttachmentRow
              key={item.id}
              item={item}
              addedBy={people.get(item.addedBy)?.name ?? ""}
              removable={!readOnly && (isAdmin || item.addedBy === viewerId)}
              removing={remove.isPending && remove.variables?.attachmentId === item.id}
              onRemove={() => remove.mutate({ projectId, attachmentId: item.id })}
            />
          ))}
          {uploads.pending.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 text-body-sm text-muted-foreground">
              <Spinner className="size-4" />
              {m.attachment_uploading({ name: item.name })}
            </li>
          ))}
        </ul>
      )}

      {/*------ Add ------*/}
      {!readOnly && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <UploadIcon />
              {m.attachment_add_files()}
            </Button>
            <Button variant="outline" size="sm" aria-expanded={linking} onClick={() => setLinking(!linking)}>
              <PlusIcon />
              {m.attachment_add_link()}
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                uploads.upload([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </div>
          <p className="text-caption text-muted-foreground">{m.attachment_drop_hint()}</p>
          {linking && <LinkForm task={task} projectId={projectId} onDone={() => setLinking(false)} onAdded={changed} />}
        </div>
      )}
    </section>
  );
}

/*===== Row =====*/

function AttachmentRow({
  item,
  addedBy,
  removable,
  removing,
  onRemove,
}: {
  item: Attachment;
  addedBy: string;
  removable: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const isLink = item.kind === "link";
  // A file's address is in the bucket on its own origin, so `download` can't name it; its stored headers do.
  const detail = isLink ? new URL(item.url).host : item.size === null ? "" : sizeOf(item.size);

  return (
    <li className="flex items-center gap-3 py-2">
      {item.preview ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-chassis outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <img
            src={item.preview.url}
            width={item.preview.width}
            height={item.preview.height}
            alt={m.attachment_open({ name: item.name })}
            loading="lazy"
            className="h-14 w-20 rounded-chassis border border-border object-cover"
          />
        </a>
      ) : (
        <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-chassis border border-border text-muted-foreground">
          {isLink ? (
            <LinkIcon aria-hidden="true" className="size-5" />
          ) : (
            <FileIcon aria-hidden="true" className="size-5" />
          )}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          // A name keeps its own direction: a Persian file name in the English page, or the other way round.
          dir="auto"
          className="truncate text-start text-body-sm font-semibold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {item.name}
        </a>
        <span className="truncate text-caption text-muted-foreground">
          <bdi>{detail}</bdi> · {m.attachment_added_by({ name: addedBy, date: formatDate(item.createdAt) })}
        </span>
      </div>

      {removable && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.attachment_remove({ name: item.name })}
          disabled={removing}
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      )}
    </li>
  );
}

/*===== Link Form =====*/

/** A link's address and optional title. Escape or a saved link closes it. */
function LinkForm({
  task,
  projectId,
  onDone,
  onAdded,
}: {
  task: TaskDetail;
  projectId: string;
  onDone: () => void;
  onAdded: () => Promise<unknown>;
}) {
  const urlId = useId();
  const titleId = useId();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const add = useMutation(
    orpc.attachment.addLink.mutationOptions({
      onSuccess: () => onDone(),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.attachment_save_failed() });
        setFields(
          Object.keys(failure.fields).length > 0
            ? failure.fields
            : { url: failure.message ?? m.attachment_save_failed() },
        );
      },
      onSettled: onAdded,
    }),
  );

  const closeOnEscape = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape") return;
    // Only close the form; a second Escape closes the drawer.
    event.stopPropagation();
    onDone();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFields({});
    add.mutate({ projectId, taskId: task.id, url, ...(title.trim() ? { title } : {}) });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field data-invalid={!!fields.url || undefined}>
        <FieldLabel htmlFor={urlId}>{m.attachment_link_url()}</FieldLabel>
        <Input
          id={urlId}
          type="url"
          dir="ltr"
          value={url}
          required
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          autoComplete="off"
          aria-invalid={!!fields.url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={closeOnEscape}
        />
        <FieldError>{fields.url}</FieldError>
      </Field>
      <Field data-invalid={!!fields.title || undefined}>
        <FieldLabel htmlFor={titleId}>{m.attachment_link_title()}</FieldLabel>
        <Input
          id={titleId}
          value={title}
          autoComplete="off"
          aria-invalid={!!fields.title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={closeOnEscape}
        />
        <FieldError>{fields.title}</FieldError>
      </Field>
      <div>
        <Button type="submit" size="sm" disabled={add.isPending}>
          {m.attachment_link_save()}
        </Button>
      </div>
    </form>
  );
}
