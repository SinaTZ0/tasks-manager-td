import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Marking } from "#/components/primitive/marking/marking";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { columnKindTitle } from "#/lib/column-title";
import { orpc } from "#/orpc/client";
import type { Column } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
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
 * heading and the row's kind ("Name, Backlog"), so the rows don't repeat a label each. The kind is printed at the
 * start and never changes: it is what the app's logic follows, whatever the column is called.
 */
export function ColumnForm({
  projectId,
  column,
  headings,
}: {
  projectId: string;
  column: Column;
  headings: ColumnFormHeadings;
}) {
  const queryClient = useQueryClient();
  const kindTitle = columnKindTitle(column.kind);
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

  const onSubmit = form.handleSubmit((values) =>
    update.mutate({
      projectId,
      columnId: column.id,
      name: values.name || null,
      wipLimit: values.wipLimit === "" ? null : Number(values.wipLimit),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby={kindId} className="flex items-start gap-4">
      <Marking id={kindId} className="mt-3 w-32 shrink-0">
        {kindTitle}
      </Marking>

      <Field data-invalid={!!(errors.name ?? serverFields.name) || undefined} className="flex-1">
        <Input
          aria-labelledby={`${headings.name} ${kindId}`}
          placeholder={kindTitle}
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
    </form>
  );
}
