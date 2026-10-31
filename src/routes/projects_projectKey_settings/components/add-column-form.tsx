import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";
import { newColumnFormSchema, type NewColumnFormValues } from "#/routes/projects_projectKey_settings/schema";

/*===== Add Column =====*/

/** Adds a custom column by name. It lands just before Done; an admin drags it anywhere on the board from there. */
export function AddColumnForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<NewColumnFormValues>({
    resolver: zodResolver(newColumnFormSchema),
    defaultValues: { name: "" },
  });
  const { errors } = form.formState;

  const add = useMutation(
    orpc.project.addColumn.mutationOptions({
      onSuccess: async () => {
        form.reset({ name: "" });
        toast.add({ title: m.settings_column_added(), type: "success" });
        await queryClient.invalidateQueries({ queryKey: orpc.project.get.key() });
      },
    }),
  );
  const failure = add.error ? describeApiFailure({ error: add.error, fallback: m.column_add_failed() }) : null;

  const onSubmit = form.handleSubmit((values) => add.mutate({ projectId, name: values.name }));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={failure?.message ?? undefined} />
      <div className="flex items-start gap-3">
        <Field data-invalid={!!(errors.name ?? failure?.fields.name) || undefined} className="max-w-md">
          <FieldLabel htmlFor="settings-new-column">{m.settings_column_add_label()}</FieldLabel>
          <Input id="settings-new-column" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError>{errors.name?.message ?? failure?.fields.name}</FieldError>
        </Field>
        {/* Lines up with the input, below the label. */}
        <Button type="submit" variant="secondary" className="mt-7" disabled={add.isPending}>
          {add.isPending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
          {m.settings_column_add()}
        </Button>
      </div>
    </form>
  );
}
