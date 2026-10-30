import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { projectNameFormSchema, type ProjectNameFormValues } from "#/routes/projects_projectKey_settings/schema";

/*===== Project Name =====*/
export function ProjectNameForm({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const form = useForm<ProjectNameFormValues>({
    resolver: zodResolver(projectNameFormSchema),
    defaultValues: { name: project.name },
  });
  const { errors, isDirty } = form.formState;

  const rename = useMutation(
    orpc.project.rename.mutationOptions({
      onSuccess: async (saved) => {
        form.reset({ name: saved.name });
        toast.add({ title: m.settings_saved(), type: "success" });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.project.get.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.project.list.key() }),
        ]);
      },
    }),
  );
  const failure = rename.error ? describeApiFailure({ error: rename.error, fallback: m.settings_save_failed() }) : null;

  const onSubmit = form.handleSubmit((values) => rename.mutate({ projectId: project.id, name: values.name }));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={failure?.message ?? undefined} />
      <div className="flex items-start gap-3">
        <Field data-invalid={!!(errors.name ?? failure?.fields.name) || undefined} className="max-w-md">
          <FieldLabel htmlFor="settings-project-name">{m.projects_name_label()}</FieldLabel>
          <Input id="settings-project-name" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError>{errors.name?.message ?? failure?.fields.name}</FieldError>
        </Field>
        {/* Lines up with the input, below the label. */}
        <Button type="submit" className="mt-7" disabled={!isDirty || rename.isPending}>
          {rename.isPending && <Spinner data-icon="inline-start" />}
          {m.settings_save()}
        </Button>
      </div>
    </form>
  );
}
