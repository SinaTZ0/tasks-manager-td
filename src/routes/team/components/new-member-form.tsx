import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";
import { m } from "#/paraglide/messages";
import { roleHint, roleItems } from "#/routes/team/role-labels";
import { newMemberFormSchema, type NewMemberFormValues } from "#/routes/team/schema";

/*===== New Teammate =====*/

/**
 * Makes an account for a new teammate (there is no sign-up). The admin passes the email and password on to them; they
 * sign in with it straight away.
 */
export function NewMemberForm() {
  const queryClient = useQueryClient();
  const roles = roleItems();
  const form = useForm<NewMemberFormValues>({
    resolver: zodResolver(newMemberFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });
  const { errors } = form.formState;

  const create = useMutation(
    orpc.team.create.mutationOptions({
      onSuccess: async (member) => {
        form.reset();
        toast.add({ title: m.team_created({ name: member.name }), type: "success" });
        await queryClient.invalidateQueries({ queryKey: orpc.team.list.key() });
      },
    }),
  );
  const failure = create.error ? describeApiFailure({ error: create.error, fallback: m.team_save_failed() }) : null;

  const onSubmit = form.handleSubmit((values) => create.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={failure?.message ?? undefined} />

        <Field data-invalid={!!(errors.name ?? failure?.fields.name) || undefined}>
          <FieldLabel htmlFor="member-name">{m.team_name_label()}</FieldLabel>
          <Input id="member-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError>{errors.name?.message ?? failure?.fields.name}</FieldError>
        </Field>

        <Field data-invalid={!!(errors.email ?? failure?.fields.email) || undefined}>
          <FieldLabel htmlFor="member-email">{m.team_email_label()}</FieldLabel>
          <Input
            id="member-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError>{errors.email?.message ?? failure?.fields.email}</FieldError>
        </Field>

        <Field data-invalid={!!(errors.password ?? failure?.fields.password) || undefined}>
          <FieldLabel htmlFor="member-password">{m.team_password_label()}</FieldLabel>
          <Input
            id="member-password"
            type="text"
            dir="ltr"
            autoComplete="new-password"
            spellCheck={false}
            variant="code"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldDescription>{m.team_password_hint({ min: PASSWORD_MIN_LENGTH })}</FieldDescription>
          <FieldError>{errors.password?.message ?? failure?.fields.password}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="member-role">{m.team_role_label()}</FieldLabel>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <>
                <Select items={roles} value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                  <SelectTrigger id="member-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* What the chosen role may do, so the admin picks knowingly. */}
                <FieldDescription>{roleHint(field.value)}</FieldDescription>
              </>
            )}
          />
        </Field>

        <Button type="submit" variant="highlight" className="self-start" disabled={create.isPending}>
          {create.isPending && <Spinner data-icon="inline-start" />}
          {m.team_create_submit()}
        </Button>
      </FieldGroup>
    </form>
  );
}
