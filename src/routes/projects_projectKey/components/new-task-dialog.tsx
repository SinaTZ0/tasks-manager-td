import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/primitive/dialog/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { SidebarMenuButton } from "#/components/primitive/sidebar/sidebar";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { columnTitle } from "#/lib/column-title";
import { normalizePersianText } from "#/lib/persian-text";
import { useShortcuts } from "#/hooks/use-shortcuts";
import { orpc } from "#/orpc/client";
import type { ColumnKind } from "#/orpc/project/constants";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== New Task =====*/

type Column = { id: string; kind: ColumnKind; name: string | null };

/**
 * The admin's "new task" key (and `n`) and its form: a title and the column it starts in, the first one on the board
 * by default. The task is created at the bottom of that column and its drawer opens, where the rest is filled in. The
 * task only exists once the form is sent, so closing the form never leaves an empty card behind.
 */
export function NewTaskDialog({
  projectId,
  projectKey,
  columns,
  defaultColumnId,
}: {
  projectId: string;
  projectKey: string;
  /** The columns a task can start in: all but cancelled, in board order. */
  columns: Column[];
  /** The first column on the board (some may be hidden). */
  defaultColumnId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  // Not while a card's drawer covers the board.
  useShortcuts([
    {
      code: "KeyN",
      run: () => {
        if (!document.querySelector("[data-slot=sheet-content]")) setOpen(true);
      },
    },
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<SidebarMenuButton variant="highlight" tooltip={m.task_new()} />}>
        <PlusIcon />
        <span>{m.task_new()}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.task_new_title()}</DialogTitle>
          <DialogDescription>{m.task_new_description()}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form starts empty each time. */}
        {open && (
          <NewTaskForm
            projectId={projectId}
            projectKey={projectKey}
            columns={columns}
            defaultColumnId={defaultColumnId ?? columns[0]?.id}
            onCreated={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewTaskForm({
  projectId,
  projectKey,
  columns,
  defaultColumnId,
  onCreated,
}: {
  projectId: string;
  projectKey: string;
  columns: Column[];
  defaultColumnId: string | undefined;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const id = useId();
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId ?? null);
  const [titleError, setTitleError] = useState<string>();
  const columnItems = columns.map((column) => ({ value: column.id, label: columnTitle(column) }));

  const create = useMutation(
    orpc.task.create.mutationOptions({
      onSuccess: async (task) => {
        await queryClient.invalidateQueries({ queryKey: orpc.task.board.key() });
        onCreated();
        // Open the new card's drawer on the same board, keeping the filters and layout the person chose.
        await navigate({
          to: "/projects/$projectKey",
          params: { projectKey },
          search: (previous) => ({ ...previous, task: taskCode({ key: projectKey, number: task.number }) }),
        });
      },
    }),
  );
  const failure = create.error ? describeApiFailure({ error: create.error, fallback: m.task_save_failed() }) : null;

  const submit = () => {
    const clean = normalizePersianText(title);
    if (!clean) return setTitleError(m.task_error_title_required());
    setTitleError(undefined);
    create.mutate({ projectId, title: clean, columnId: columnId ?? undefined });
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FieldGroup>
        <FormAlert message={failure?.message ?? undefined} />

        {/*------ Title ------*/}
        <Field data-invalid={!!(titleError ?? failure?.fields.title) || undefined}>
          <FieldLabel htmlFor={`${id}-title`}>{m.task_title_label()}</FieldLabel>
          <Input
            id={`${id}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoComplete="off"
            aria-invalid={!!(titleError ?? failure?.fields.title)}
          />
          <FieldError>{titleError ?? failure?.fields.title}</FieldError>
        </Field>

        {/*------ Column ------*/}
        <Field data-invalid={!!failure?.fields.columnId || undefined}>
          <FieldLabel htmlFor={`${id}-column`}>{m.task_new_column()}</FieldLabel>
          <Select items={columnItems} value={columnId} onValueChange={(value) => value && setColumnId(String(value))}>
            <SelectTrigger id={`${id}-column`} className="w-full" aria-invalid={!!failure?.fields.columnId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columnItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{failure?.fields.columnId}</FieldError>
        </Field>

        <DialogFooter showCloseButton>
          <Button type="submit" variant="highlight" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.task_new_submit()}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
