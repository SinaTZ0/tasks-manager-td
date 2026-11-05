import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { authClient } from "#/lib/auth-client";
import { describeAuthError } from "#/lib/auth-errors";
import { PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";
import { m } from "#/paraglide/messages";
import { changePasswordSchema, type ChangePasswordValues } from "#/routes/profile/schema";

/*===== Password Form =====*/

/**
 * Changes the viewer's own password through Better-Auth, which owns the session: it signs out every other device and
 * hands this one a new session, so the person stays signed in here.
 */
export function PasswordForm() {
  const id = useId();
  const [formError, setFormError] = useState<string>();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", repeatPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(undefined);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    if (error?.code === "INVALID_PASSWORD") {
      return form.setError("currentPassword", { message: m.profile_password_wrong() });
    }
    if (error) return setFormError(describeAuthError(error));
    form.reset();
    toast.add({ title: m.profile_password_changed(), type: "success" });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />

        <Field data-invalid={!!errors.currentPassword || undefined}>
          <FieldLabel htmlFor={`${id}-current`}>{m.profile_password_current_label()}</FieldLabel>
          <Input
            id={`${id}-current`}
            type="password"
            dir="ltr"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...form.register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={!!errors.newPassword || undefined}>
          <FieldLabel htmlFor={`${id}-new`}>{m.profile_password_new_label()}</FieldLabel>
          <Input
            id={`${id}-new`}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...form.register("newPassword")}
          />
          <FieldDescription>{m.profile_password_hint({ min: PASSWORD_MIN_LENGTH })}</FieldDescription>
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.repeatPassword || undefined}>
          <FieldLabel htmlFor={`${id}-repeat`}>{m.profile_password_repeat_label()}</FieldLabel>
          <Input
            id={`${id}-repeat`}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            aria-invalid={!!errors.repeatPassword}
            {...form.register("repeatPassword")}
          />
          <FieldError errors={[errors.repeatPassword]} />
        </Field>

        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {m.profile_password_submit()}
        </Button>
      </FieldGroup>
    </form>
  );
}
