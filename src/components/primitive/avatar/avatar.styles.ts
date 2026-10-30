import { cva } from "class-variance-authority";
import { twCut } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

// A person is a small blank keycap with their initial, seated in a compact cut. Square caps rather than circles keep
// people part of the same instrument as the controls. It never presses: there's no hover or active state.
const twRootStyles = defineStyles({
  layout: "group/avatar relative isolate flex shrink-0 select-none",
  geometry: "rounded-keycap-compact",
  appearanceFace: "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit]",
  appearanceCut: joinStyles(twCut.compact),
});

// `graphite` marks a different role at a glance (the task's owner beside its assignee); say the role in words too
const twTone = defineStyles({
  light: { appearance: "text-keycap-foreground after:bg-keycap after:shadow-keycap-compact" },
  graphite: {
    appearance: "text-keycap-graphite-foreground after:bg-keycap-graphite after:shadow-keycap-graphite-compact",
  },
});

const twSize = defineStyles({
  sm: { geometry: "size-6", typography: "text-caption" },
  default: { geometry: "size-8", typography: "text-body-sm" },
  lg: { geometry: "size-10", typography: "text-body" },
});

const avatarVariants = cva(joinStyles(twRootStyles), {
  variants: { tone: composeStyles(twTone), size: composeStyles(twSize) },
  defaultVariants: { tone: "light", size: "default" },
});

/*===== Parts =====*/

const twImageStyles = defineStyles({
  geometry: "aspect-square size-full rounded-[inherit]",
  appearance: "object-cover",
});

const twFallbackStyles = defineStyles({
  layout: "flex size-full items-center justify-center",
  typography: "font-heading leading-none font-bold",
});

// The badge is an LED in the cap's corner (online, running). Pair it with words elsewhere; colour alone means nothing.
const twBadgeStyles = defineStyles({
  layout: "absolute -end-1 -bottom-1 z-10 inline-flex items-center justify-center select-none",
  geometry: "size-2.5 rounded-xs",
  appearance: "bg-current text-signal-positive shadow-led-on ring-2 ring-card",
  icon: "[&>svg]:hidden",
});

// Caps in a group keep their own cuts, so they sit side by side instead of overlapping
const twGroupStyles = defineStyles({
  layout: "group/avatar-group flex items-center gap-2",
});

const twGroupCountStyles = defineStyles({
  layout: "relative isolate flex shrink-0 items-center justify-center",
  geometry:
    "size-8 rounded-keycap-compact group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6",
  typography: "font-mono text-caption font-medium",
  appearance:
    "text-foreground after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:bg-card",
  appearanceCut: joinStyles(twCut.compact),
  icon: "[&>svg]:size-4",
});

/*===== Class Composition =====*/

const avatarImageClasses = joinStyles(twImageStyles);
const avatarFallbackClasses = joinStyles(twFallbackStyles);
const avatarBadgeClasses = joinStyles(twBadgeStyles);
const avatarGroupClasses = joinStyles(twGroupStyles);
const avatarGroupCountClasses = joinStyles(twGroupCountStyles);

export {
  avatarBadgeClasses,
  avatarFallbackClasses,
  avatarGroupClasses,
  avatarGroupCountClasses,
  avatarImageClasses,
  avatarVariants,
  twSize,
  twTone,
};
