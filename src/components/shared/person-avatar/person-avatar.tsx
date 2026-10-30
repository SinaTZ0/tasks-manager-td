import { Avatar, AvatarFallback, AvatarImage } from "#/components/primitive/avatar/avatar";

/*===== Person Avatar =====*/

/**
 * A teammate as a keycap with their initial. The initial alone names no one, so the full name is in a tooltip and,
 * for screen readers, in `sr-only` text. `owner` uses the graphite cap, so an owner reads apart from an assignee
 * without colour alone. Where the name is printed right beside the cap, pass `decorative` so it isn't read twice. With
 * `src` (their profile picture) the picture fills the cap; the initial shows while it loads or if it fails.
 */
export function PersonAvatar({
  name,
  src,
  size = "sm",
  owner = false,
  decorative = false,
}: {
  name: string;
  src?: string | null | undefined;
  size?: "default" | "sm" | "lg";
  owner?: boolean;
  decorative?: boolean;
}) {
  const initial = Array.from(name.trim())[0] ?? "?";

  return (
    <Avatar
      size={size}
      tone={owner ? "graphite" : "light"}
      title={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>
        <span aria-hidden="true">{initial}</span>
        {!decorative && <span className="sr-only">{name}</span>}
      </AvatarFallback>
    </Avatar>
  );
}
