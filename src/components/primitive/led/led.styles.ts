import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Shared Styles =====*/

// Square, like the LEDs printed beside sampler keys; a round dot reads as a web status badge
const twSharedStyles = defineStyles({
  layout: "inline-block shrink-0",
  geometry: "rounded-xs",
});

/*===== Signal =====*/

// One meaning per colour across the app: orange = action or recording, yellow = attention or blocked, blue =
// selection, green = running or positive. The LED's colour is `currentColor`, so its glow follows it.
const twSignal = defineStyles({
  action: { appearance: "text-signal-action" },
  attention: { appearance: "text-signal-attention" },
  selection: { appearance: "text-signal-selection" },
  positive: { appearance: "text-signal-positive" },
  // The display's ink, with no meaning of its own: the plain lit cells of a level meter, below `action` at the top
  glass: { appearance: "text-glass-foreground" },
});

/*===== State =====*/

// An unlit LED is still a visible part, grey plastic, so the reader can see a state exists even when it is off.
// Blinking is for live states (running, blocked); under reduced motion it stays lit.
const twState = defineStyles({
  on: { appearance: "bg-current shadow-led-on" },
  off: { appearance: "bg-signal-off shadow-led-off" },
  blink: { appearance: "bg-current shadow-led-on", motion: "motion-safe:animate-led-blink" },
});

/*===== Size =====*/

const twSize = defineStyles({
  sm: { geometry: "size-1.5" },
  default: { geometry: "size-2" },
  // One cell of a level meter: taller than wide, so a row of them reads as a single scale
  bar: { geometry: "h-3 w-1.5" },
});

/*===== Class Composition =====*/

const ledVariants = cva(joinStyles(twSharedStyles), {
  variants: {
    signal: composeStyles(twSignal),
    state: composeStyles(twState),
    size: composeStyles(twSize),
  },
  compoundVariants: [
    // Bars stand side by side in a bezel, where the wide glow ring would smear across its neighbours, and the grey of
    // an unlit LED would outshine the lit ones against the black
    { size: "bar", state: ["on", "blink"], class: "shadow-led-bar-on" },
    { size: "bar", state: "off", class: "bg-glass-foreground/14 shadow-led-bar-off" },
    // A small unlit cell on the glass, for the same reason: grey plastic would outshine the lit one beside it
    { signal: "glass", size: ["sm", "default"], state: "off", class: "bg-glass-foreground/20 shadow-led-bar-off" },
  ],
  defaultVariants: { signal: "action", state: "on", size: "default" },
});

/*===== Bezel =====*/

// The black block a level meter's bars sit in. It keeps lit meaning lit on both housings: straight on the light one,
// a pale cell reads as an empty slot and a dark unlit one as the full part.
const ledBezelClasses = joinStyles(
  defineStyles({
    layout: "flex gap-0.75",
    geometry: "rounded-xs p-0.5",
    appearance: "bg-glass shadow-led-bezel",
  }),
);

export { ledBezelClasses, ledVariants, twSignal, twState, twSize };
