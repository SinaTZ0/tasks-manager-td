import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Display =====*/

// Dark glass sunk into the housing: the shading is the same top wall and lit lower lip as a cut, so the window reads
// as set into the panel rather than stuck on it. The glass is dark in both themes, like a real display.
const twDisplayStyles = defineStyles({
  layout: "group/display flex",
  geometry: "rounded-chassis",
  appearance: "bg-glass text-glass-foreground shadow-glass",
  typography: "font-mono",
});

// `inline` is a one-line window the height of a compact key, for a live value in a row of keys (the header's timer).
const twSize = defineStyles({
  inline: { layout: "flex-row items-center gap-3", geometry: "h-8 px-3" },
  sm: { layout: "flex-col gap-1", geometry: "px-3 py-2" },
  default: { layout: "flex-col gap-2", geometry: "p-4" },
  lg: { layout: "flex-col gap-3", geometry: "p-5" },
});

const displayVariants = cva(joinStyles(twDisplayStyles), {
  variants: { size: composeStyles(twSize) },
  defaultVariants: { size: "default" },
});

/*===== Parts =====*/

// Labels inside the glass print dimmer so the value stays the brightest thing in the window
const displayLabelClasses = joinStyles(
  defineStyles({
    typography: "font-heading text-marking tracking-marking",
    appearance: "text-glass-muted",
  }),
);

// The live value. `tabular-nums` keeps a ticking timer from jittering sideways. A small window prints a small value,
// read from the window's `data-size`, so callers never resize the value by hand.
const displayValueClasses = joinStyles(
  defineStyles({
    typography:
      "font-mono text-stat tracking-readout tabular-nums group-data-[size=inline]/display:text-body-sm group-data-[size=lg]/display:text-display group-data-[size=sm]/display:text-h3",
    appearance: "text-glass-foreground",
  }),
);

// A touch zone on the glass: a region of the display that answers a press, like the pads a sampler prints in its
// screen. It latches through `aria-pressed`: a latched zone prints at full brightness, one let go dims to the glass's
// muted ink (60% still holds 5:1 on the glass). The focus ring is the glass ink, since the housing's ring colour
// vanishes on the dark glass.
const displayButtonClasses = joinStyles(
  defineStyles({
    layout: "group/display-button flex flex-col items-stretch gap-1",
    geometry: "min-h-10 rounded-chassis-compact border-0 px-3 py-2",
    typography: "text-start",
    appearance: "bg-transparent text-glass-foreground",
    interaction: "cursor-pointer transition-[background-color,opacity] duration-75 outline-none select-none",
    hover: "hover:bg-glass-foreground/8",
    active: "active:bg-glass-foreground/14",
    state: "aria-[pressed=false]:opacity-60",
    focus:
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glass-foreground focus-visible:outline-solid",
  }),
);

export { displayButtonClasses, displayLabelClasses, displayValueClasses, displayVariants, twSize };
