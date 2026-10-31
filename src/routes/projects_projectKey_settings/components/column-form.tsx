import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Marking } from "#/components/primitive/marking/marking";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { columnKindTitle, columnTitle } from "#/lib/column-title";
import { orpc } from "#/orpc/client";
import type { Column } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { ConfirmDialog } from "#/routes/projects_projectKey/components/confirm-dialog";
import {
  columnFormSchema,
  type ColumnFormOutput,
  type ColumnFormValues,
} from "#/routes/projects_projectKey_settings/schema";

/*===== Column =====*/

/** The ids of the headings printed once above the rows, which name each row's fields together with its kind. */
export type ColumnFormHeadings = { name: string; wip: string };

/**
 * One column's name and WIP limit, as a row under headings printed once (`headings`): each field is named by its
 * heading and the row's own label ("Name, Doing"), so the rows don't repeat a label each. A system column's label is
 * its kind, which never changes: it is what the app's logic follows, whatever the column is called. It carries a lock
 * where a custom column has its remove key; removing asks first, and a column with cards on the board says to empty it
 * instead.
 */
export function ColumnForm({
  projectId,
  column,
  cardCount,
  headings,
}: {
  projectId: string;
  column: Column;
  /** How many cards it holds on the board. */
  cardCount: number;
  headings: ColumnFormHeadings;
}) {
  const queryClient = useQueryClient();
  const custom = column.kind === "custom";
  const kindTitle = custom ? columnTitle(column) : columnKindTitle(column.kind);
  const form = useForm<ColumnFormValues, unknown, ColumnFormOutput>({
    resolver: zodResolver(columnFormSchema),
    defaultValues: { name: column.name ?? "", wipLimit: column.wipLimit === null ? "" : String(column.wipLimit) },
  });
  const { errors, isDirty } = form.formState;
  const kindId = `column-${column.id}-kind`;

  const update = useMutation(
    orpc.project.updateColumn.mutationOptions({
      onSuccess: async (saved) => {
        form.reset({ name: saved.name ?? "", wipLimit: saved.wipLimit === null ? "" : String(saved.wipLimit) });
        toast.add({ title: m.settings_saved(), type: "success" });
        await queryClient.invalidateQueries({ queryKey: orpc.project.get.key() });
      },
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.settings_save_failed() });
        if (failure.message) toast.add({ title: failure.message, type: "error" });
      },
    }),
  );
  const serverFields = update.error
    ? describeApiFailure({ error: update.error, fallback: m.settings_save_failed() }).fields
    : {};

  /*------ Remove ------*/
  const [notice, setNotice] = useState<string>();
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
        setNotice(failure.message ?? m.column_remove_failed());
      },
    }),
  );
  const askRemove = () => {
    if (cardCount > 0) return setNotice(m.column_error_not_empty());
    setNotice(undefined);
    setConfirming(true);
  };

  const onSubmit = form.handleSubmit((values) =>
    update.mutate({
      projectId,
      columnId: column.id,
      name: values.name || null,
      wipLimit: values.wipLimit === "" ? null : Number(values.wipLimit),
    }),
  );

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={onSubmit} noValidate aria-labelledby={kindId} className="flex items-start gap-4">
        <Marking id={kindId} className="mt-3 w-32 shrink-0">
          {kindTitle}
        </Marking>

        <Field data-invalid={!!(errors.name ?? serverFields.name) || undefined} className="flex-1">
          <Input
            aria-labelledby={`${headings.name} ${kindId}`}
            placeholder={custom ? undefined : kindTitle}
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          <FieldError>{errors.name?.message ?? serverFields.name}</FieldError>
        </Field>

        <Field data-invalid={!!(errors.wipLimit ?? serverFields.wipLimit) || undefined} className="w-32 shrink-0">
          <Input
            aria-labelledby={`${headings.wip} ${kindId}`}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            variant="code"
            aria-invalid={!!errors.wipLimit}
            {...form.register("wipLimit")}
          />
          <FieldError>{errors.wipLimit?.message ?? serverFields.wipLimit}</FieldError>
        </Field>

        <Button type="submit" variant="secondary" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner data-icon="inline-start" />}
          {m.settings_save()}
        </Button>

        {/*------ Remove ------*/}
        {custom ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={m.settings_column_remove({ column: kindTitle })}
            disabled={remove.isPending}
            onClick={askRemove}
          >
            <Trash2Icon />
          </Button>
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
            <LockIcon aria-label={m.settings_column_fixed()} className="size-4" />
          </span>
        )}
      </form>

      <FormAlert message={notice} />
      {confirming !== null && (
        <ConfirmDialog
          request={{
            title: m.settings_column_remove_title({ column: kindTitle }),
            description: m.settings_column_remove_description(),
            confirm: m.settings_column_remove({ column: kindTitle }),
          }}
          open={confirming}
          onOpenChange={setConfirming}
          onConfirm={() => remove.mutate({ projectId, columnId: column.id })}
        />
      )}
    </div>
  );
}
