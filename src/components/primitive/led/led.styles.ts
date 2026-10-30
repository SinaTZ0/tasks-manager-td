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
});

/*===== Class Composition =====*/

const ledVariants = cva(joinStyles(twSharedStyles), {
  variants: {
    signal: composeStyles(twSignal),
    state: composeStyles(twState),
    size: composeStyles(twSize),
  },
  defaultVariants: { signal: "action", state: "on", size: "default" },
});

export { ledVariants, twSignal, twState, twSize };
