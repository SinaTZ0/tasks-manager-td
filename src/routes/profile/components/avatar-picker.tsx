import { useMutation } from "@tanstack/react-query";
import { ImageIcon, XIcon } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { MediaImage } from "#/components/shared/media-image/media-image";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { MEDIA_ACCEPTED_TYPES } from "#/orpc/media/constants";
import type { Media } from "#/orpc/media/contract";
import { m } from "#/paraglide/messages";

/*===== Avatar Picker =====*/

/**
 * The profile's picture: uploads the picked file right away (`media.upload`, kind `avatar`, cropped square) and shows
 * it. The form sends its id when saved, which attaches it; removing it only takes effect on save too.
 */
export function AvatarPicker({
  value,
  onChange,
  serverError,
}: {
  value: Media | null;
  onChange: (media: Media | null) => void;
  serverError?: string | undefined;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation(orpc.media.upload.mutationOptions({ onSuccess: onChange }));
  const failure = upload.error
    ? describeApiFailure({ error: upload.error, fallback: m.profile_avatar_upload_failed() })
    : null;
  const error = failure?.fields.file ?? failure?.message ?? serverError;

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={inputId}>{m.profile_avatar_label()}</FieldLabel>
      <div className="flex flex-wrap items-center gap-4">
        {value && (
          <MediaImage media={value} variant="md" alt={m.profile_avatar_preview()} className="size-24 rounded-keycap" />
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? <Spinner data-icon="inline-start" /> : <ImageIcon data-icon="inline-start" />}
          {value ? m.profile_avatar_change() : m.profile_avatar_choose()}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <XIcon data-icon="inline-start" />
            {m.profile_avatar_remove()}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={MEDIA_ACCEPTED_TYPES}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload.mutate({ kind: "avatar", file });
        }}
      />
      <FieldDescription>{m.profile_avatar_hint()}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
