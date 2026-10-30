import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVerticalIcon, ListChecksIcon, PencilIcon, XIcon } from "lucide-react";
import { useId, useState, type CSSProperties, type KeyboardEvent, type PointerEventHandler } from "react";

import { Button } from "#/components/primitive/button/button";
import { Checkbox } from "#/components/primitive/checkbox/checkbox";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Progress, ProgressLabel, ProgressValue } from "#/components/primitive/progress/progress";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate, formatNumber } from "#/lib/locale";
import { normalizePersianText } from "#/lib/persian-text";
import { positionBetween } from "#/lib/position";
import { cn } from "#/lib/utils";
import { CHECKLIST_MAX_ITEMS, CHECKLIST_TEXT_MAX_LENGTH } from "#/orpc/checklist/constants";
import type { ChecklistItem } from "#/orpc/checklist/contract";
import type { Person } from "#/orpc/project/contract";
import type { TaskDetail } from "#/orpc/task/contract";
import { client, orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { taskQuery } from "#/routes/projects_projectKey/queries";

/*===== Helpers =====*/

/** The step's text checked the way the server checks it, or the error to show. */
function checkText(draft: string): { text: string } | { error: string } {
  const text = normalizePersianText(draft);
  if (!text) return { error: m.checklist_error_text_required() };
  if (text.length > CHECKLIST_TEXT_MAX_LENGTH)
    return { error: m.checklist_error_text_too_long({ max: CHECKLIST_TEXT_MAX_LENGTH }) };
  return { text };
}

/** The first error a failed save carries, as a toast. */
function toastFailure(error: unknown) {
  const failure = describeApiFailure({ error, fallback: m.checklist_save_failed() });
  toast.add({ title: Object.values(failure.fields)[0] ?? failure.message ?? m.checklist_save_failed(), type: "error" });
}

/*===== Task Checklist =====*/

/**
 * The card's checklist (docs/task-manager-plan.md → slice 13): the steps in order under a meter of how many are done,
 * each with a box to tick, a key to rename and one to remove, and a field at the end where Enter adds a step and
 * stays ready for the next. Steps are dragged by their grip, or picked up from it with Space and moved with the arrows.
 * Ticks and moves show at once and are put right if the server refuses them. A viewer sees the list and the meter only.
 */
export function TaskChecklist({
  task,
  projectId,
  people,
  readOnly,
}: {
  task: TaskDetail;
  projectId: string;
  people: Map<string, Person>;
  /** A viewer reads the list, and changes nothing. */
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const contextId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const items = task.checklist;
  const done = items.filter((item) => item.doneAt !== null).length;
  const { queryKey } = taskQuery({ projectId, number: task.number });

  /*------ Mutations ------*/
  /** Shows a change to the list before the server answers; returns the list to restore if it refuses. */
  const patchList = async (change: (list: ChecklistItem[]) => ChecklistItem[]) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (data) =>
      data
        ? { ...data, checklist: change(data.checklist).toSorted((a, b) => (a.position < b.position ? -1 : 1)) }
        : data,
    );
    return { previous };
  };
  const settle = {
    onError: (error: unknown, _input: unknown, context: { previous?: TaskDetail } | undefined) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toastFailure(error);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
      ]),
  };
  const update = useMutation({
    ...settle,
    mutationFn: (input: { itemId: string; text?: string; done?: boolean }) =>
      client.checklist.update({ projectId, ...input }),
    onMutate: ({ itemId, text, done: ticked }) =>
      patchList((list) =>
        list.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...(text === undefined ? {} : { text }),
                ...(ticked === undefined ? {} : { doneAt: ticked ? new Date() : null, doneBy: null }),
              }
            : item,
        ),
      ),
  });
  const move = useMutation({
    ...settle,
    mutationFn: (input: { itemId: string; position: string }) => client.checklist.move({ projectId, ...input }),
    onMutate: ({ itemId, position }) =>
      patchList((list) => list.map((item) => (item.id === itemId ? { ...item, position } : item))),
  });
  const remove = useMutation({
    ...settle,
    mutationFn: (itemId: string) => client.checklist.remove({ projectId, itemId }),
    onMutate: (itemId) => patchList((list) => list.filter((item) => item.id !== itemId)),
  });

  /*------ Reorder ------*/
  // Only the pointer drags through dnd-kit. Its keyboard sensor listens on the document, and the drawer (a Base UI
  // dialog) stops arrow keys from leaving it, so the grip moves its step with the arrows itself (`moveBy`).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [announcement, setAnnouncement] = useState("");
  const textOf = (id: string | number) => items.find((item) => item.id === id)?.text ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active }) => m.checklist_picked({ item: textOf(active.id) }),
    onDragOver: () => undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? m.checklist_dropped({
            item: textOf(active.id),
            position: items.findIndex((item) => item.id === over.id) + 1,
            total: items.length,
          })
        : m.checklist_returned({ item: textOf(active.id) }),
    onDragCancel: ({ active }) => m.checklist_returned({ item: textOf(active.id) }),
  };

  /** Moves a step to place `to` (from 0), keyed between its new neighbours. */
  const moveTo = (itemId: string, to: number) => {
    const from = items.findIndex((item) => item.id === itemId);
    if (from === -1 || to === from || to < 0 || to >= items.length) return false;
    const order = arrayMove(items, from, to);
    const position = positionBetween(order[to - 1]?.position ?? null, order[to + 1]?.position ?? null);
    move.mutate({ itemId, position });
    return true;
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over)
      moveTo(
        String(active.id),
        items.findIndex((item) => item.id === over.id),
      );
  };
  /** A step moved one place up or down from its grip; the grip keeps the focus as the row moves. */
  const moveBy = (itemId: string, step: -1 | 1) => {
    const to = items.findIndex((item) => item.id === itemId) + step;
    if (!moveTo(itemId, to)) return;
    setAnnouncement(m.checklist_moved({ item: textOf(itemId), position: to + 1, total: items.length }));
    requestAnimationFrame(() => document.getElementById(checklistGripId(itemId))?.focus());
  };

  return (
    <section aria-labelledby="task-checklist-title" className="flex flex-col gap-4">
      <h3 id="task-checklist-title" className="flex items-center gap-2 font-heading text-h4">
        <ListChecksIcon aria-hidden="true" className="size-4" />
        {m.checklist_title()}
      </h3>

      {/*------ Progress ------*/}
      {items.length > 0 && (
        <Progress
          value={done}
          max={items.length}
          getAriaValueText={() => m.checklist_progress({ done, total: items.length })}
        >
          <ProgressLabel className="sr-only">{m.checklist_title()}</ProgressLabel>
          <ProgressValue>{() => `${formatNumber(done)}/${formatNumber(items.length)}`}</ProgressValue>
        </Progress>
      )}

      {/*------ Items ------*/}
      {items.length > 0 ? (
        <DndContext
          id={contextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{ announcements, screenReaderInstructions: { draggable: m.checklist_drag_instructions() } }}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col">
              {items.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  people={people}
                  readOnly={readOnly}
                  editing={editingId === item.id}
                  onEdit={(editing) => setEditingId(editing ? item.id : null)}
                  onTick={(ticked) => update.mutate({ itemId: item.id, done: ticked })}
                  onRename={(text) => update.mutate({ itemId: item.id, text })}
                  onRemove={() => remove.mutate(item.id)}
                  onStep={(step) => moveBy(item.id, step)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-body-sm text-muted-foreground">{m.checklist_empty()}</p>
      )}

      <output className="sr-only">{announcement}</output>

      {/*------ Add ------*/}
      {!readOnly && items.length < CHECKLIST_MAX_ITEMS && <AddStep task={task} projectId={projectId} />}
    </section>
  );
}

/*===== Row =====*/

/** The id of a step's grip, found again after the step has moved. */
const checklistGripId = (itemId: string) => `checklist-grip-${itemId}`;

/**
 * One step: its grip, its box, its text (a label for the box, so clicking the text ticks it too) and, once ticked, who
 * ticked it and when. Renaming swaps the text for a field. The grip only takes the keyboard and the pointer while the
 * step isn't being renamed.
 */
function ChecklistRow({
  item,
  people,
  readOnly,
  editing,
  onEdit,
  onTick,
  onRename,
  onRemove,
  onStep,
}: {
  item: ChecklistItem;
  people: Map<string, Person>;
  readOnly: boolean;
  editing: boolean;
  onEdit: (editing: boolean) => void;
  onTick: (done: boolean) => void;
  onRename: (text: string) => void;
  onRemove: () => void;
  /** Moves the step one place up (-1) or down (1). */
  onStep: (step: -1 | 1) => void;
}) {
  const boxId = useId();
  const ticked = item.doneAt !== null;
  const doneBy = item.doneBy ? people.get(item.doneBy) : undefined;
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: readOnly || editing,
    attributes: { roleDescription: m.checklist_drag_role() },
  });

  return (
    <li
      ref={setNodeRef}
      style={
        {
          "--drag-transform": CSS.Translate.toString(transform) ?? "none",
          "--drag-transition": transition ?? "none",
        } as CSSProperties
      }
      className={cn(
        "flex drag-motion items-start gap-2 rounded-chassis py-1.5",
        isDragging && "relative z-10 bg-accent",
      )}
    >
      {!readOnly && (
        <Button
          ref={setActivatorNodeRef}
          id={checklistGripId(item.id)}
          variant="ghost"
          size="icon-xs"
          aria-label={m.checklist_grip({ item: item.text })}
          className="cursor-grab touch-none"
          {...attributes}
          onPointerDown={listeners?.onPointerDown as PointerEventHandler<HTMLButtonElement> | undefined}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            onStep(event.key === "ArrowUp" ? -1 : 1);
          }}
        >
          <GripVerticalIcon />
        </Button>
      )}
      <Checkbox
        id={boxId}
        checked={ticked}
        disabled={readOnly}
        onCheckedChange={(checked) => onTick(checked)}
        className="mt-1"
      />

      {editing ? (
        <RenameStep item={item} onDone={() => onEdit(false)} onRename={onRename} />
      ) : (
        <label htmlFor={boxId} className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          <span className={cn("text-body-sm break-words", ticked && "text-muted-foreground line-through")}>
            {item.text}
          </span>
          {item.doneAt && doneBy && (
            <span className="text-caption text-muted-foreground">
              {m.checklist_done_by({ name: doneBy.name, date: formatDate(item.doneAt) })}
            </span>
          )}
        </label>
      )}

      {!readOnly && !editing && (
        <span className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.checklist_rename({ item: item.text })}
            onClick={() => onEdit(true)}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.checklist_remove({ item: item.text })}
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        </span>
      )}
    </li>
  );
}

/*===== Rename =====*/

/** The step's text as a field: Enter or leaving it saves, Escape puts the text back. */
function RenameStep({
  item,
  onDone,
  onRename,
}: {
  item: ChecklistItem;
  onDone: () => void;
  onRename: (text: string) => void;
}) {
  const [draft, setDraft] = useState(item.text);
  const [error, setError] = useState<string>();

  const commit = () => {
    const checked = checkText(draft);
    if ("error" in checked) return setError(checked.error);
    if (checked.text !== item.text) onRename(checked.text);
    onDone();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      // Only end the rename; a second Escape closes the drawer.
      event.stopPropagation();
      onDone();
    }
  };

  return (
    <Field data-invalid={!!error || undefined} className="min-w-0 flex-1">
      <Input
        // The field replaces the text the person just chose to rename.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={draft}
        aria-label={m.checklist_rename_label({ item: item.text })}
        aria-invalid={!!error}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/*===== Add =====*/

/** The field at the end of the list: Enter adds the step and empties the field for the next one. */
function AddStep({ task, projectId }: { task: TaskDetail; projectId: string }) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const add = useMutation(
    orpc.checklist.add.mutationOptions({
      onSuccess: () => setDraft(""),
      onError: (failure) => {
        const described = describeApiFailure({ error: failure, fallback: m.checklist_save_failed() });
        setError(described.fields.text ?? described.message ?? m.checklist_save_failed());
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: taskQuery({ projectId, number: task.number }).queryKey }),
          queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
        ]),
    }),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (add.isPending) return;
    const checked = checkText(draft);
    if ("error" in checked) return setError(checked.error);
    setError(undefined);
    add.mutate({ projectId, taskId: task.id, text: checked.text });
  };

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={inputId}>{m.checklist_add_label()}</FieldLabel>
      <Input
        id={inputId}
        value={draft}
        placeholder={m.checklist_add_placeholder()}
        aria-invalid={!!error}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
