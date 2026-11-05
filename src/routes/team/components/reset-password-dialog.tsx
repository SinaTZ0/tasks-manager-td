import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/primitive/dialog/dialog";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/primitive/tooltip/tooltip";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { TeamMember } from "#/orpc/team/contract";
import { m } from "#/paraglide/messages";
import { resetPasswordFormSchema, type ResetPasswordFormValues } from "#/routes/team/schema";

/*===== Reset Password =====*/

/**
 * A teammate's way back in when they lost their password: the admin types a new one and passes it on, as they did with
 * the first. It shows as plain text for that reason. The teammate can change it on their profile afterwards.
 */
export function ResetPasswordDialog({ member, disabled }: { member: TeamMember; disabled: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "" },
  });
  const { errors } = form.formState;

  const reset = useMutation(
    orpc.team.resetPassword.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.add({ title: m.team_reset_password_done({ name: member.name }), type: "success" });
      },
    }),
  );
  const failure = reset.error ? describeApiFailure({ error: reset.error, fallback: m.team_save_failed() }) : null;

  const onSubmit = form.handleSubmit(({ password }) => reset.mutate({ userId: member.id, password }));

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="secondary"
              size="icon-sm"
              disabled={disabled}
              aria-label={m.team_reset_password_open({ name: member.name })}
              onClick={() => setOpen(true)}
            >
              <KeyRoundIcon />
            </Button>
          }
        />
        <TooltipContent>{m.team_reset_password_open({ name: member.name })}</TooltipContent>
      </Tooltip>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        // Emptied once it has finished closing, so a password never waits in the page for the next time it opens.
        onOpenChangeComplete={(next) => {
          if (!next) {
            form.reset();
            reset.reset();
          }
        }}
      >
        <DialogContent>
          <form noValidate className="contents" onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{m.team_reset_password_title({ name: member.name })}</DialogTitle>
              <DialogDescription>{m.team_reset_password_description()}</DialogDescription>
            </DialogHeader>
            <FormAlert message={failure?.message ?? undefined} />
            <Field data-invalid={!!(errors.password ?? failure?.fields.password) || undefined}>
              <FieldLabel htmlFor={id}>{m.team_password_label()}</FieldLabel>
              <Input
                id={id}
                type="text"
                dir="ltr"
                autoComplete="new-password"
                spellCheck={false}
                variant="code"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <FieldError>{errors.password?.message ?? failure?.fields.password}</FieldError>
            </Field>
            <DialogFooter showCloseButton>
              <Button type="submit" variant="highlight" disabled={reset.isPending}>
                {reset.isPending && <Spinner data-icon="inline-start" />}
                {m.team_reset_password_submit()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
