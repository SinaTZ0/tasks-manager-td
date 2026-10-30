import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
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

/**
 * One column's name and WIP limit. The kind is printed beside it and never changes: it is what the app's logic
 * follows, whatever the column is called.
 */
export function ColumnForm({ projectId, column }: { projectId: string; column: Column }) {
  const queryClient = useQueryClient();
  const kindTitle = columnKindTitle(column.kind);
  const form = useForm<ColumnFormValues, unknown, ColumnFormOutput>({
    resolver: zodResolver(columnFormSchema),
    defaultValues: { name: column.name ?? "", wipLimit: column.wipLimit === null ? "" : String(column.wipLimit) },
  });
  const { errors, isDirty } = form.formState;
  const ids = { name: `column-${column.id}-name`, wip: `column-${column.id}-wip` };

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
    <form onSubmit={onSubmit} noValidate aria-label={kindTitle} className="flex items-start gap-4">
      <Marking className="mt-9 w-32 shrink-0">{kindTitle}</Marking>

      <Field data-invalid={!!(errors.name ?? serverFields.name) || undefined} className="flex-1">
        <FieldLabel htmlFor={ids.name}>{m.settings_column_name_label()}</FieldLabel>
        <Input id={ids.name} placeholder={kindTitle} aria-invalid={!!errors.name} {...form.register("name")} />
        <FieldError>{errors.name?.message ?? serverFields.name}</FieldError>
      </Field>

      <Field data-invalid={!!(errors.wipLimit ?? serverFields.wipLimit) || undefined} className="w-32 shrink-0">
        <FieldLabel htmlFor={ids.wip}>{m.settings_column_wip_label()}</FieldLabel>
        <Input
          id={ids.wip}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          variant="code"
          aria-invalid={!!errors.wipLimit}
          {...form.register("wipLimit")}
        />
        <FieldError>{errors.wipLimit?.message ?? serverFields.wipLimit}</FieldError>
      </Field>

      <Button type="submit" variant="secondary" className="mt-7" disabled={!isDirty || update.isPending}>
        {update.isPending && <Spinner data-icon="inline-start" />}
        {m.settings_save()}
      </Button>
    </form>
  );
}
