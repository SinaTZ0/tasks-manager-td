import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useState, type FormEvent } from "react";

import { Button } from "#/components/primitive/button/button";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { toast } from "#/components/primitive/toast/toast";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { describeApiFailure } from "#/lib/api-error";
import { NAME_MAX_LENGTH } from "#/lib/auth-constants";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Media } from "#/orpc/media/contract";
import type { Profile } from "#/orpc/profile/contract";
import { m } from "#/paraglide/messages";
import { AvatarPicker } from "#/routes/profile/components/avatar-picker";

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.profile.get.queryOptions()),
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.profile_title(), index: false }),
  component: ProfilePage,
});

/*===== Page =====*/

/**
 * The viewer's own profile (docs/task-manager-plan.md → slice 8): their name and picture, which show on every card,
 * list and comment of theirs. The email and role are an admin's to change, on the team page.
 */
function ProfilePage() {
  const { data: profile } = useSuspenseQuery(orpc.profile.get.queryOptions());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-h2">{m.profile_title()}</h1>
        <p className="text-muted-foreground">{m.profile_description()}</p>
      </div>
      <Card>
        <CardContent>
          {/* Keyed by what was saved, so a save that comes back changed starts the form from it. */}
          <ProfileForm key={`${profile.name}|${profile.avatar?.id ?? ""}`} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}

/*===== Form =====*/

function ProfileForm({ profile }: { profile: Profile }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<Media | null>(profile.avatar);
  const [nameError, setNameError] = useState<string>();

  const save = useMutation(
    orpc.profile.update.mutationOptions({
      onSuccess: (saved) => {
        queryClient.setQueryData(orpc.profile.get.queryKey(), saved);
        toast.add({ title: m.profile_saved(), type: "success" });
      },
      // Names and pictures show in the header, on every board and in every member list.
      onSettled: () => queryClient.invalidateQueries(),
    }),
  );
  const failure = save.error ? describeApiFailure({ error: save.error, fallback: m.profile_save_failed() }) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError(m.team_error_name_required());
    setNameError(undefined);
    save.mutate({ name: trimmed, avatarMediaId: avatar?.id ?? null });
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <FormAlert message={failure?.message ?? undefined} />
      <Field data-invalid={!!(nameError ?? failure?.fields.name) || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{m.profile_name_label()}</FieldLabel>
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!(nameError ?? failure?.fields.name)}
        />
        <FieldError>{nameError ?? failure?.fields.name}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-email`}>{m.profile_email_label()}</FieldLabel>
        <Input id={`${id}-email`} value={profile.email} dir="ltr" readOnly />
      </Field>
      <AvatarPicker value={avatar} onChange={setAvatar} serverError={failure?.fields.avatarMediaId} />
      <Button type="submit" className="self-start" disabled={save.isPending}>
        {m.profile_save()}
      </Button>
    </form>
  );
}
