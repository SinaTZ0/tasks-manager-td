import { cva } from "class-variance-authority";
import { slotClasses } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Group =====*/

// A row of related keys seated in one long slot (instrument.styles.ts → Slot), like the function keys above a
// sampler's display: the slot's background is the void, so the gaps between keys read as the same black gap as a
// single cut. The keys drop their own cut, which would otherwise draw a second, overlapping hole around each one.
const twGroupStyles = defineStyles({
  layout: "w-fit",
  // Nested groups sit side by side, each in its own slot
  state: "has-[>[data-slot=button-group]]:gap-2 has-[>[data-slot=button-group]]:bg-transparent",
  stateKeys: "*:before:hidden",
  focus: "*:focus-visible:z-10",
});

const twOrientation = defineStyles({
  horizontal: { layout: "flex-row" },
  vertical: { layout: "flex-col" },
});

const buttonGroupVariants = cva([slotClasses, joinStyles(twGroupStyles)], {
  variants: { orientation: composeStyles(twOrientation) },
  defaultVariants: { orientation: "horizontal" },
});

/*===== Text =====*/

// A label seated in the slot: a flush plate with a printed legend, so it reads as part of the strip but not as a key
const twTextStyles = defineStyles({
  layout: "flex items-center gap-2",
  geometry: "rounded-keycap-compact px-3",
  typography: "font-heading text-button",
  appearance: "bg-card text-muted-foreground",
  icon: "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
});

/*===== Separator =====*/

// A wider stretch of void between two keys, for splitting a strip into sets
const twSeparatorStyles = defineStyles({
  layout: "relative self-stretch",
  geometry: "data-horizontal:mx-px data-horizontal:h-auto data-vertical:my-px data-vertical:w-auto",
  appearance: "bg-transparent",
});

/*===== Class Composition =====*/

const buttonGroupTextClasses = joinStyles(twTextStyles);
const buttonGroupSeparatorClasses = joinStyles(twSeparatorStyles);

export { buttonGroupSeparatorClasses, buttonGroupTextClasses, buttonGroupVariants };
