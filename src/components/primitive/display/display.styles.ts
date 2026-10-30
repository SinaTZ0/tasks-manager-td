import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Display =====*/

// Dark glass sunk into the housing: the shading is the same top wall and lit lower lip as a cut, so the window reads
// as set into the panel rather than stuck on it. The glass is dark in both themes, like a real display.
const twDisplayStyles = defineStyles({
  layout: "group/display flex flex-col",
  geometry: "rounded-chassis",
  appearance: "bg-glass text-glass-foreground shadow-glass",
  typography: "font-mono",
});

const twSize = defineStyles({
  sm: { layout: "gap-1", geometry: "px-3 py-2" },
  default: { layout: "gap-2", geometry: "p-4" },
  lg: { layout: "gap-3", geometry: "p-5" },
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
      "font-mono text-stat tracking-readout tabular-nums group-data-[size=lg]/display:text-display group-data-[size=sm]/display:text-h3",
    appearance: "text-glass-foreground",
  }),
);

export { displayLabelClasses, displayValueClasses, displayVariants, twSize };
