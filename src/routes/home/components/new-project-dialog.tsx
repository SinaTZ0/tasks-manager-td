import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { PeopleChecklist } from "#/components/shared/people-checklist/people-checklist";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { PROJECT_KEY_MAX_LENGTH } from "#/orpc/project/constants";
import { m } from "#/paraglide/messages";
import { newProjectFormSchema, type NewProjectFormOutput, type NewProjectFormValues } from "#/routes/home/schema";

/*===== New Project =====*/

/**
 * The admin's "new project" key and its form: a name, the task-code key, and who is on it. The project opens with its
 * seven columns, and the admin lands on its board.
 */
export function NewProjectDialog({ viewerId }: { viewerId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="highlight" />}>
        <PlusIcon data-icon="inline-start" />
        {m.projects_new()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.projects_new_title()}</DialogTitle>
          <DialogDescription>{m.projects_new_description()}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form starts empty each time. */}
        {open && <NewProjectForm viewerId={viewerId} />}
      </DialogContent>
    </Dialog>
  );
}

function NewProjectForm({ viewerId }: { viewerId: string }) {
  // Loaded by the page's loader for admins.
  const { data: team } = useSuspenseQuery(orpc.team.list.queryOptions());
  const people = team.filter((person) => person.status === "active");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<NewProjectFormValues, unknown, NewProjectFormOutput>({
    resolver: zodResolver(newProjectFormSchema),
    // The admin making it usually works on it too.
    defaultValues: { name: "", key: "", memberIds: [viewerId] },
  });
  const { errors } = form.formState;

  const create = useMutation(
    orpc.project.create.mutationOptions({
      onSuccess: async (project) => {
        await queryClient.invalidateQueries({ queryKey: orpc.project.list.key() });
        await navigate({ to: "/projects/$projectKey", params: { projectKey: project.key } });
      },
    }),
  );
  const failure = create.error ? describeApiFailure({ error: create.error, fallback: m.projects_save_failed() }) : null;

  const onSubmit = form.handleSubmit((values) => create.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={failure?.message ?? undefined} />

        <div className="flex items-start gap-6">
          <Field data-invalid={!!(errors.name ?? failure?.fields.name) || undefined} className="flex-1">
            <FieldLabel htmlFor="project-name">{m.projects_name_label()}</FieldLabel>
            <Input id="project-name" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError>{errors.name?.message ?? failure?.fields.name}</FieldError>
          </Field>

          <Field data-invalid={!!(errors.key ?? failure?.fields.key) || undefined} className="w-56 shrink-0">
            <FieldLabel htmlFor="project-key">{m.projects_key_label()}</FieldLabel>
            <Input
              id="project-key"
              dir="ltr"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={PROJECT_KEY_MAX_LENGTH}
              variant="code"
              aria-invalid={!!errors.key}
              {...form.register("key")}
            />
            <FieldDescription>{m.projects_key_hint()}</FieldDescription>
            <FieldError>{errors.key?.message ?? failure?.fields.key}</FieldError>
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">{m.projects_members_label()}</FieldLegend>
          <Controller
            control={form.control}
            name="memberIds"
            render={({ field }) => (
              <PeopleChecklist
                people={people}
                selectedIds={field.value}
                onToggle={(id, checked) =>
                  field.onChange(checked ? [...field.value, id] : field.value.filter((value) => value !== id))
                }
              />
            )}
          />
          <FieldError>{failure?.fields.memberIds}</FieldError>
        </FieldSet>

        <DialogFooter>
          <Button type="submit" variant="highlight" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.projects_create_submit()}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
