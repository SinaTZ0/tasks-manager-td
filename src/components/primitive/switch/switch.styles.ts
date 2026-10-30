import { defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

// A slide switch: the root is the open cut (the void) and the thumb is a small keycap that travels inside it. No
// colour on the track: the thumb's position and its orange face carry the state.
const twRootStyles = defineStyles({
  layout: "peer group/switch relative inline-flex shrink-0 items-center",
  geometry:
    "rounded-chassis p-cut data-[size=default]:h-8 data-[size=default]:w-15 data-[size=sm]:h-6 data-[size=sm]:w-11",
  appearance: "bg-cut shadow-cut",
  interaction: "cursor-pointer outline-none",
  focus:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  // An invalid switch gets a yellow edge around its cut: yellow is the attention signal
  // (`outline-solid` is needed because `outline-none` above clears the style). Base UI sets `data-invalid` inside a
  // Field; a bare `aria-invalid` covers standalone use.
  invalid:
    "aria-invalid:outline-2 aria-invalid:outline-offset-1 aria-invalid:outline-signal-attention aria-invalid:outline-solid data-invalid:outline-2 data-invalid:outline-offset-1 data-invalid:outline-signal-attention data-invalid:outline-solid",
  disabled: "data-disabled:cursor-not-allowed data-disabled:opacity-50",
});

/*===== Thumb =====*/

// The thumb is half the track wide, so moving it by its own width lands it on the inline end. `rtl:` flips the
// direction, so on means "towards the end of the line" in both languages.
const twThumbStyles = defineStyles({
  layout: "pointer-events-none block",
  geometry: "h-full w-1/2 rounded-keycap-compact",
  appearance: "bg-keycap shadow-keycap-compact",
  interaction: "transition-[translate,background-color] duration-150 ease-instrument",
  state:
    "data-checked:translate-x-full data-checked:bg-highlight data-checked:shadow-keycap-highlight-compact rtl:data-checked:-translate-x-full",
  hover: "group-hover/switch:brightness-105",
});

/*===== Class Composition =====*/

const switchClasses = joinStyles(twRootStyles);
const switchThumbClasses = joinStyles(twThumbStyles);

export { switchClasses, switchThumbClasses };
