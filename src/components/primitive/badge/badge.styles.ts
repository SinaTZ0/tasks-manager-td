import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Shared Styles =====*/

// A badge is a stamped label: flat, a thin printed edge, a near-square corner and the housing's marking type. It is
// never raised like a key, so it can't be mistaken for a control.
const twSharedStyles = defineStyles({
  layout: "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5",
  // Three words at most, so it never wraps or grows.
  geometry: "h-6 overflow-hidden rounded-keycap-compact border px-2",
  geometryIcon: "has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5",
  typography: "font-heading text-marking tracking-marking whitespace-nowrap",
  interaction: "transition-colors duration-150",
  focus:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  invalid: "aria-invalid:border-destructive",
  icon: "[&>svg]:pointer-events-none [&>svg]:size-3.5!",
});

// Status badges print a square swatch before the word, in the signal colour with the same meaning everywhere. The
// word carries the meaning; the swatch is how it's found at a glance.
const twSwatch = "before:size-1.5 before:shrink-0 before:rounded-xs";

/*===== Appearance =====*/

// `default` is a graphite label strip, like the black tape labels on hardware; `outline` is printed straight on the
// housing; `highlight` (the orange stamp) marks one featured item per view.
const twVariant = defineStyles({
  default: {
    appearance: "border-transparent bg-primary text-primary-foreground",
    hover: "[a]:hover:bg-primary-hover",
  },
  highlight: {
    appearance: "border-transparent bg-highlight text-highlight-foreground",
    hover: "[a]:hover:bg-highlight-hover",
  },
  secondary: {
    appearance: "border-transparent bg-secondary text-secondary-foreground",
    hover: "[a]:hover:bg-accent",
  },
  outline: {
    appearance: "border-border bg-transparent text-foreground",
    hover: "[a]:hover:bg-accent",
  },
  success: {
    appearance: "border-success/40 bg-success-surface text-success before:bg-signal-positive",
    layout: twSwatch,
  },
  warning: {
    appearance: "border-warning/40 bg-warning-surface text-warning before:bg-signal-attention",
    layout: twSwatch,
  },
  info: {
    appearance: "border-info/40 bg-info-surface text-info before:bg-signal-selection",
    layout: twSwatch,
  },
  destructive: {
    appearance: "border-destructive/40 bg-destructive-surface text-destructive before:bg-destructive",
    layout: twSwatch,
  },
});

/*===== Class Composition =====*/

const badgeVariants = cva(joinStyles(twSharedStyles), {
  variants: {
    variant: composeStyles(twVariant),
  },
  defaultVariants: {
    variant: "default",
  },
});

export { badgeVariants, twVariant };
