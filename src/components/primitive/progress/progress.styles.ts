import { markingClasses, readoutClasses } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

const twRootStyles = defineStyles({
  layout: "flex flex-wrap items-baseline gap-x-3 gap-y-2",
});

/*===== Track =====*/

// A level meter, like a channel meter on a mixer: a row of LED segments in a cut. Unlit segments are dark plastic
// (the off-LED grey sunk into the void), and the gaps between segments are drawn over the fill in the cut colour,
// so lit and unlit segments line up. `--threshold` places the printed plan marker.
const twTrackStyles = defineStyles({
  layout: "relative flex w-full items-center",
  geometry: "h-3 rounded-chassis-compact border-2 border-cut",
  appearance: "bg-[color-mix(in_srgb,var(--color-signal-off)_30%,var(--color-cut))] shadow-cut",
  appearanceSegments:
    "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(to_right,transparent_0_6px,var(--color-cut)_6px_8px)]",
});

/*===== Indicator =====*/

// Segments within the plan glow green (positive). Once the value passes the plan (`data-over` on the root), the
// segments past it glow orange, so an overrun shows at a glance. `--split` is where the plan ends, measured along the
// lit part; the gradient runs with the reading direction. The gradient is only applied when over, because a hard stop
// at exactly 100% still paints a hairline of orange at the end of the fill.
const twIndicatorStyles = defineStyles({
  geometry: "h-full",
  appearance: "bg-signal-positive",
  stateOver:
    "in-data-over:bg-[linear-gradient(to_right,var(--color-signal-positive)_var(--split),var(--color-signal-action)_var(--split))] in-data-over:rtl:bg-[linear-gradient(to_left,var(--color-signal-positive)_var(--split),var(--color-signal-action)_var(--split))]",
  interaction: "transition-[width] duration-200 ease-instrument",
});

/*===== Threshold =====*/

// A tick printed on the housing just above the meter where the plan ends
const twThresholdStyles = defineStyles({
  layout: "pointer-events-none absolute start-(--threshold) -top-2",
  geometry: "h-1.5 w-px",
  appearance: "bg-foreground",
});

/*===== Label and Value =====*/

const twLabelStyles = defineStyles({ typography: markingClasses });
const twValueStyles = defineStyles({ layout: "ms-auto", typography: readoutClasses });

/*===== Class Composition =====*/

const progressClasses = joinStyles(twRootStyles);
const progressTrackClasses = joinStyles(twTrackStyles);
const progressIndicatorClasses = joinStyles(twIndicatorStyles);
const progressThresholdClasses = joinStyles(twThresholdStyles);
const progressLabelClasses = joinStyles(twLabelStyles);
const progressValueClasses = joinStyles(twValueStyles);

export {
  progressClasses,
  progressIndicatorClasses,
  progressLabelClasses,
  progressThresholdClasses,
  progressTrackClasses,
  progressValueClasses,
};
