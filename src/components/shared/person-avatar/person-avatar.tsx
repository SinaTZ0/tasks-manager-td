import { Avatar, AvatarFallback, AvatarImage } from "#/components/primitive/avatar/avatar";
import { TapTooltip } from "#/components/primitive/tooltip/tooltip";

/*===== Person Avatar =====*/

/**
 * A teammate as a keycap with their initial. The initial alone names no one, so pointing at the cap or tapping it shows the
 * full name in a tooltip, and screen readers get it as `sr-only` text. `owner` uses the graphite cap, so an owner reads apart
 * from an assignee without colour alone. Where the name is printed right beside the cap, pass `decorative`: no tooltip,
 * and nothing read twice. With `src` (their profile picture) the picture fills the cap; the initial shows while it
 * loads or if it fails. `tooltip={false}` keeps the name for screen readers but drops the tooltip, for a cap nobody
 * can point at (a card being dragged).
 */
export function PersonAvatar({
  name,
  src,
  size = "sm",
  owner = false,
  decorative = false,
  tooltip = true,
}: {
  name: string;
  src?: string | null | undefined;
  size?: "default" | "sm" | "lg";
  owner?: boolean;
  decorative?: boolean;
  tooltip?: boolean;
}) {
  const initial = Array.from(name.trim())[0] ?? "?";

  const avatar = (
    <Avatar size={size} tone={owner ? "graphite" : "light"} aria-hidden={decorative || undefined}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>
        <span aria-hidden="true">{initial}</span>
        {!decorative && <span className="sr-only">{name}</span>}
      </AvatarFallback>
    </Avatar>
  );
  if (decorative || !tooltip) return avatar;

  // The cap stays a picture, not a key: the trigger only listens for the pointer and a tap. Screen readers have the name
  // in the cap already, so the tooltip is for the eye.
  return <TapTooltip trigger={avatar}>{name}</TapTooltip>;
}
