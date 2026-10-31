import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

import {
  avatarBadgeClasses,
  avatarFallbackClasses,
  avatarGroupCountClasses,
  avatarGroupVariants,
  avatarImageClasses,
  avatarVariants,
} from "./avatar.styles";

/*===== Avatar =====*/

/**
 * A person as a small keycap. The initial alone identifies no one: in the fallback, hide the initial from assistive
 * tech and add the full name as `sr-only` text, unless the name is printed right beside the avatar.
 */
function Avatar({
  className,
  size = "default",
  tone = "light",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg";
  tone?: "light" | "graphite";
}) {
  const classes = avatarVariants({ size, tone });

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-tone={tone}
      {...props}
      className={typeof className === "function" ? (state) => cn(classes, className(state)) : cn(classes, className)}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(avatarImageClasses, className(state))
          : cn(avatarImageClasses, className)
      }
    />
  );
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(avatarFallbackClasses, className(state))
          : cn(avatarFallbackClasses, className)
      }
    />
  );
}

function AvatarBadge({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="avatar-badge" className={cn(avatarBadgeClasses, className)} {...props} />;
}

function AvatarGroup({
  className,
  orientation,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof avatarGroupVariants>) {
  return (
    <div
      data-slot="avatar-group"
      data-orientation={orientation}
      className={cn(avatarGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

/** The "+3" plate after a group: a flat plate, not a keycap, because it isn't a person. */
function AvatarGroupCount({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="avatar-group-count" className={cn(avatarGroupCountClasses, className)} {...props} />;
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge };
