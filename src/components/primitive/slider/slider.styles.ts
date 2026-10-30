import { defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

const twRootStyles = defineStyles({
  layout: "data-horizontal:w-full data-vertical:h-full",
});

/*===== Control =====*/

// The control is the hit area: 40px across the groove, so the thin slot is still easy to grab
const twControlStyles = defineStyles({
  layout:
    "relative flex w-full touch-none items-center select-none data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
  geometry: "data-horizontal:h-10 data-vertical:w-10",
  disabled: "data-disabled:opacity-50",
});

/*===== Track =====*/

// A narrow machined slot the fader cap rides in
const twTrackStyles = defineStyles({
  layout: "relative grow select-none",
  geometry: "rounded-chassis-compact data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2",
  appearance: "bg-cut shadow-cut",
});

/*===== Range =====*/

// The lit part of the slot, from the start to the cap. Orange: moving a fader is an action.
const twRangeStyles = defineStyles({
  layout: "select-none data-horizontal:h-full data-vertical:w-full",
  geometry: "rounded-chassis-compact",
  appearance: "bg-highlight opacity-85",
});

/*===== Thumb =====*/

// A grooved fader cap. The centre groove shows the exact position, and makes the part read as a knob to drag,
// not a button to press. Base UI renders the thumb as a `div` around a hidden `input`, so focus is `has-focus-visible`.
const twThumbStyles = defineStyles({
  layout: "relative block shrink-0 select-none",
  geometry: "rounded-keycap-compact data-horizontal:h-7 data-horizontal:w-4 data-vertical:h-4 data-vertical:w-7",
  appearance: "bg-keycap shadow-keycap-compact",
  appearanceGroove:
    "after:absolute after:bg-foreground/70 data-horizontal:after:inset-x-1 data-horizontal:after:top-1/2 data-horizontal:after:h-px data-horizontal:after:-translate-y-1/2 data-vertical:after:inset-y-1 data-vertical:after:start-1/2 data-vertical:after:w-px",
  interaction: "cursor-grab active:cursor-grabbing",
  hover: "hover:brightness-105",
  focus:
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid",
  disabled: "data-disabled:pointer-events-none",
});

/*===== Class Composition =====*/

const sliderClasses = joinStyles(twRootStyles);
const sliderControlClasses = joinStyles(twControlStyles);
const sliderTrackClasses = joinStyles(twTrackStyles);
const sliderRangeClasses = joinStyles(twRangeStyles);
const sliderThumbClasses = joinStyles(twThumbStyles);

export { sliderClasses, sliderControlClasses, sliderRangeClasses, sliderThumbClasses, sliderTrackClasses };
