import { Avatar, AvatarFallback, AvatarImage } from "#/components/primitive/avatar/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/primitive/tooltip/tooltip";

/*===== Person Avatar =====*/

/**
 * A teammate as a keycap with their initial. The initial alone names no one, so pointing at the cap shows the full name
 * in a tooltip, and screen readers get it as `sr-only` text. `owner` uses the graphite cap, so an owner reads apart
 * from an assignee without colour alone. Where the name is printed right beside the cap, pass `decorative`: no tooltip,
 * and nothing read twice. With `src` (their profile picture) the picture fills the cap; the initial shows while it
 * loads or if it fails.
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

  const avatar = (
    <Avatar size={size} tone={owner ? "graphite" : "light"} aria-hidden={decorative || undefined}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>
        <span aria-hidden="true">{initial}</span>
        {!decorative && <span className="sr-only">{name}</span>}
      </AvatarFallback>
    </Avatar>
  );
  if (decorative) return avatar;

  return (
    <Tooltip>
      {/* The cap stays a picture, not a key: the trigger only listens for the pointer. Screen readers have the name in
          the cap already, so the tooltip is for the eye. */}
      <TooltipTrigger render={avatar} />
      <TooltipContent aria-hidden="true">{name}</TooltipContent>
    </Tooltip>
  );
}
