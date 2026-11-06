import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useController, useForm, useWatch, type Control } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Display, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Field, FieldError } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { toast } from "#/components/primitive/toast/toast";
import { SaveBar } from "#/components/shared/save-bar/save-bar";
import { describeApiFailure } from "#/lib/api-error";
import { columnKindTitle, columnTitle } from "#/lib/column-title";
import { formatNumber } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import { WIP_LIMIT_MAX } from "#/orpc/project/constants";
import type { Column, Project } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { ConfirmDialog } from "#/routes/projects_projectKey/components/confirm-dialog";
import { columnsFormSchema, type ColumnsFormValues } from "#/routes/projects_projectKey_settings/schema";

/*===== Column Strips =====*/

const valuesOf = (columns: Column[]): ColumnsFormValues => ({
  columns: Object.fromEntries(
    columns.map((column) => [column.id, { name: column.name ?? "", wipLimit: column.wipLimit }]),
  ),
});

/**
 * The board's columns stood side by side in a tray, in board order, like a mixer's channels. All of them are one form
 * with one Save: each changed column is saved on its own, so one that fails keeps its edits and its error while the
 * others go through. The rows are keyed by column id, not position, so a column added or removed by someone else
 * doesn't shift the edits onto its neighbours.
 */
export function ColumnStrips({
  project,
  cardCount,
}: {
  project: Project;
  /** How many cards a column holds on the board. */
  cardCount: (columnId: string) => number;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ColumnsFormValues>({
    resolver: zodResolver(columnsFormSchema),
    values: valuesOf(project.columns),
    // A refetch (after a save, or someone else's change) must leave unsaved edits and a failed row's error alone.
    resetOptions: { keepDirtyValues: true, keepErrors: true },
  });
  const { isSubmitting } = form.formState;
  // Compared with the saved columns rather than read from `dirtyFields`: the form changes that object in place, so the
  // React Compiler would keep a stale answer.
  const rows = useWatch({ control: form.control, name: "columns" });
  const changed = project.columns.filter((column) => {
    const row = rows[column.id];
    return row && (row.name !== (column.name ?? "") || row.wipLimit !== column.wipLimit);
  });
  const update = useMutation(orpc.project.updateColumn.mutationOptions());

  /** Saves one column; on a failure it marks the column's fields and says whether it went through. */
  const saveColumn = async ({ column, values }: { column: Column; values: ColumnsFormValues }) => {
    const row = values.columns[column.id];
    if (!row) return true;
    try {
      const saved = await update.mutateAsync({
        projectId: project.id,
        columnId: column.id,
        name: row.name || null,
        wipLimit: row.wipLimit,
      });
      form.resetField(`columns.${column.id}.name`, { defaultValue: saved.name ?? "" });
      form.resetField(`columns.${column.id}.wipLimit`, { defaultValue: saved.wipLimit });
      return true;
    } catch (error) {
      const failure = describeApiFailure({ error, fallback: m.settings_save_failed() });
      if (failure.fields.name) form.setError(`columns.${column.id}.name`, { message: failure.fields.name });
      if (failure.fields.wipLimit) form.setError(`columns.${column.id}.wipLimit`, { message: failure.fields.wipLimit });
      if (failure.message) toast.add({ title: failure.message, type: "error" });
      return false;
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await Promise.all(changed.map((column) => saveColumn({ column, values })));
    await queryClient.invalidateQueries({ queryKey: orpc.project.get.key() });
    if (saved.every(Boolean)) toast.add({ title: m.settings_saved(), type: "success" });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* `relative`: a strip's `sr-only` parts are absolute, and past the scroller's edge they would widen the page. */}
      <div className="relative flex gap-3 overflow-x-auto rounded-chassis bg-tray p-3 shadow-tray">
        {project.columns.map((column) => (
          <ColumnStrip
            key={column.id}
            projectId={project.id}
            column={column}
            count={cardCount(column.id)}
            control={form.control}
          />
        ))}
      </div>
      {/* `resetOptions` above applies to every reset, and this one must drop the edits. */}
      <SaveBar
        count={changed.length}
        saving={isSubmitting}
        onDiscard={() => form.reset(valuesOf(project.columns), { keepDirtyValues: false, keepErrors: false })}
      />
    </form>
  );
}

/*===== Strip =====*/

/**
 * One column: its kind printed on top (what the app's logic follows, whatever the column is called), its name, what it
 * holds and its limit on the glass, and the keys that step the limit. Below 1 is no limit. Past the limit an LED lights
 * yellow as the keys go, before anything is saved. Both fields go through `useController`, not `register`: the React
 * Compiler would memoize `register`'s props and a form error read from `errors`, which the form changes in place.
 */
function ColumnStrip({
  projectId,
  column,
  count,
  control,
}: {
  projectId: string;
  column: Column;
  count: number;
  control: Control<ColumnsFormValues>;
}) {
  const kindId = useId();
  const custom = column.kind === "custom";
  const title = custom ? columnTitle(column) : columnKindTitle(column.kind);
  const { field: name, fieldState: nameState } = useController({ control, name: `columns.${column.id}.name` });
  const { field: wip, fieldState: wipState } = useController({ control, name: `columns.${column.id}.wipLimit` });
  const limit = wip.value;

  return (
    <section
      aria-labelledby={kindId}
      className="flex min-w-44 flex-1 flex-col gap-3 rounded-chassis bg-card p-3 shadow-housing"
    >
      <div className="flex h-11 items-center justify-between gap-2">
        <div className="min-w-0 truncate">
          <Marking id={kindId}>{title}</Marking>
        </div>
        {custom ? (
          <RemoveKey projectId={projectId} column={column} title={title} count={count} />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
            <LockIcon aria-label={m.settings_column_fixed()} className="size-4" />
          </span>
        )}
      </div>

      <Field data-invalid={nameState.invalid || undefined}>
        <Input
          aria-label={m.settings_column_name_label()}
          placeholder={custom ? undefined : title}
          aria-invalid={nameState.invalid}
          {...name}
        />
        <FieldError>{nameState.error?.message}</FieldError>
      </Field>

      <Display size="sm">
        <div className="flex items-center justify-between gap-2">
          <DisplayLabel>{m.settings_column_cards()}</DisplayLabel>
          <span className="flex items-center gap-2">
            {limit !== null && count > limit && (
              <Led signal="attention" state="on" size="sm" label={m.board_over_wip()} />
            )}
            <DisplayValue>{formatNumber(count)}</DisplayValue>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <DisplayLabel>{m.settings_column_wip_label()}</DisplayLabel>
          <DisplayValue aria-live="polite">
            {limit === null ? (
              <>
                <span aria-hidden="true">∞</span>
                <span className="sr-only">{m.settings_column_no_limit()}</span>
              </>
            ) : (
              formatNumber(limit)
            )}
          </DisplayValue>
        </div>
      </Display>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={m.settings_column_wip_lower({ column: title })}
          disabled={limit === null}
          onClick={() => wip.onChange(limit === null || limit <= 1 ? null : limit - 1)}
        >
          <MinusIcon />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={m.settings_column_wip_raise({ column: title })}
          disabled={limit === WIP_LIMIT_MAX}
          onClick={() => wip.onChange((limit ?? 0) + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
      <FieldError>{wipState.error?.message}</FieldError>
    </section>
  );
}

/*===== Remove =====*/

/** Removes a custom column, asking first. A column with cards on the board says to empty it instead. */
function RemoveKey({
  projectId,
  column,
  title,
  count,
}: {
  projectId: string;
  column: Column;
  title: string;
  count: number;
}) {
  const queryClient = useQueryClient();
  // Kept after the dialog closes, so it can play its way out.
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const remove = useMutation(
    orpc.project.removeColumn.mutationOptions({
      onSuccess: async () => {
        toast.add({ title: m.settings_column_removed(), type: "success" });
        await queryClient.invalidateQueries({ queryKey: orpc.project.get.key() });
      },
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.column_remove_failed() });
        toast.add({ title: failure.message ?? m.column_remove_failed(), type: "error" });
      },
    }),
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={m.settings_column_remove({ column: title })}
        disabled={remove.isPending}
        onClick={() => {
          if (count > 0) toast.add({ title: m.column_error_not_empty(), type: "error" });
          else setConfirming(true);
        }}
      >
        <Trash2Icon />
      </Button>
      {confirming !== null && (
        <ConfirmDialog
          request={{
            title: m.settings_column_remove_title({ column: title }),
            description: m.settings_column_remove_description(),
            confirm: m.settings_column_remove({ column: title }),
          }}
          open={confirming}
          onOpenChange={setConfirming}
          onConfirm={() => remove.mutate({ projectId, columnId: column.id })}
        />
      )}
    </>
  );
}
