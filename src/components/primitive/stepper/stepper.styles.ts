import { cva } from "class-variance-authority";

import { keycapVariants } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Track =====*/

// A row of stages printed along a tray, like the pattern steps on a sequencer. A long row wraps under itself.
const twStepperStyles = defineStyles({
  layout: "flex flex-wrap items-center gap-y-2",
});

const twItemStyles = defineStyles({
  layout: "group/stepper-item flex items-center",
});

/*===== Separator =====*/

// The groove leading into a step. It lights green along the path the work has taken, up to the step it is on now, so
// the lit stretch reads as how far it has come. The first step has none.
const twSeparatorStyles = defineStyles({
  layout: "shrink-0 group-first/stepper-item:hidden",
  geometry: "mx-1.5 h-0.5 w-5 rounded-full",
  appearance: "bg-signal-off",
  state: "data-lit:bg-signal-positive data-lit:shadow-led-on",
});

/*===== Step =====*/

// A step is printed on the tray with its LED before its name; one that can be chosen is a ghost key, a press away.
const twStepStyles = defineStyles({
  layout: "inline-flex shrink-0 items-center gap-2",
  geometry: "h-8 rounded-keycap-compact px-3 pointer-coarse:h-10",
  typography: "font-heading text-button whitespace-nowrap",
  interaction: "outline-none select-none",
  focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
});

// Passed steps print in full ink, the ones ahead dimmer. The current step is a light keycap latched in its cut: where
// the work is now. It is no key to press, so it keeps the plain cursor and no hover.
const twStepState = defineStyles({
  complete: { appearance: "text-foreground" },
  current: {
    appearance: keycapVariants({ tone: "light", scale: "compact" }),
    interaction: "cursor-default hover:after:brightness-92",
  },
  upcoming: { appearance: "text-muted-foreground" },
});

// A step that moves the work there when pressed.
const twStepPressable = defineStyles({
  interaction: "cursor-pointer transition-colors duration-75",
  hover: "hover:bg-accent hover:text-foreground",
});

/*===== Class Composition =====*/

const stepperClasses = joinStyles(twStepperStyles);
const stepperItemClasses = joinStyles(twItemStyles);
const stepperSeparatorClasses = joinStyles(twSeparatorStyles);
const stepperStepPressableClasses = joinStyles(twStepPressable);

const stepperStepVariants = cva(joinStyles(twStepStyles), {
  variants: { state: composeStyles(twStepState) },
  defaultVariants: { state: "upcoming" },
});

export {
  stepperClasses,
  stepperItemClasses,
  stepperSeparatorClasses,
  stepperStepPressableClasses,
  stepperStepVariants,
  twStepState,
};
