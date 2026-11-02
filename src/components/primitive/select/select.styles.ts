import { cva } from "class-variance-authority";
import { twCut, markingClasses } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Trigger Styles =====*/

// The trigger is a field plate in a cut, like Input (input.styles.ts), with a chevron printed at the end. A button can
// draw pseudo-elements, so here the trigger itself carries the cut and plate.
const twTriggerStyles = defineStyles({
  layout: "group/select-trigger relative isolate flex w-fit items-center justify-between gap-2",
  // The selected value renders as a single clamped row, even when an item contains an icon.
  layoutValue:
    "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5",
  geometry: "border-0 py-2 ps-4 pe-3",
  typography: "whitespace-nowrap",
  appearance: "bg-transparent data-placeholder:text-muted-foreground",
  appearancePlate:
    "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:transition-[inset,box-shadow,filter] after:duration-75 after:ease-instrument",
  interaction: "cursor-pointer outline-none select-none before:transition-colors before:duration-75",
  // Focus and an open popup light the cut orange; invalid lights it yellow while unfocused, as on every field
  focus: "focus-visible:before:bg-cut-focus",
  state: "data-popup-open:before:bg-cut-focus",
  invalid: "aria-invalid:not-focus-visible:not-data-popup-open:before:bg-signal-attention",
  disabled:
    "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:after:bg-field-disabled data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:after:bg-field-disabled",
  icon: "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
});

// `field` is the plate an ordinary form field sits on. `key` is a light keycap for a select that sets a view rather
// than a value (the board's filters): it reads as a key in a row of keys and stays sunk while its list is open. A key
// trigger is meant for the compact `sm` size.
const twTriggerVariant = defineStyles({
  field: {
    // `body-lg` is 16px, which keeps iOS Safari from zooming in on focus
    typography: "text-body-lg",
    appearance: "text-foreground after:bg-field after:shadow-field",
  },
  // `quiet` is the field plate hidden until the trigger is pointed at, focused or open (or invalid), so a value read far
  // more often than changed prints as text with its chevron (input.styles.ts → quiet plate).
  quiet: {
    typography: "text-body-lg",
    appearance: "text-foreground before:opacity-0 after:bg-field after:opacity-0 after:shadow-field",
    hover: "hover:before:opacity-100 hover:after:opacity-100",
    state:
      "focus-visible:before:opacity-100 focus-visible:after:opacity-100 aria-invalid:before:opacity-100 aria-invalid:after:opacity-100 data-popup-open:before:opacity-100 data-popup-open:after:opacity-100",
    disabled:
      "disabled:hover:before:opacity-0 disabled:hover:after:opacity-0 data-disabled:hover:before:opacity-0 data-disabled:hover:after:opacity-0",
  },
  key: {
    typography: "font-heading text-button",
    appearance: "text-keycap-foreground after:bg-keycap after:shadow-keycap-compact",
    hover: "hover:after:brightness-105",
    state:
      "data-popup-open:after:inset-press-compact data-popup-open:after:shadow-keycap-pressed-compact data-popup-open:after:brightness-92",
  },
});

// `sm` is a compact part: smaller radius and a narrower cut, like the compact keys
const twTriggerSize = defineStyles({
  default: {
    geometry: "h-11 rounded-keycap",
    appearanceCut: joinStyles(twCut.regular),
  },
  sm: {
    geometry: "h-10 rounded-keycap-compact",
    appearanceCut: joinStyles(twCut.compact),
  },
});

const twTriggerIconStyles = defineStyles({
  interaction: "pointer-events-none",
  geometry: "size-4.5",
  appearance: "text-muted-foreground",
  // The chevron flips while the popup is open
  state: "transition-transform duration-75 group-data-popup-open/select-trigger:rotate-180",
});

const twValueStyles = defineStyles({
  layout: "flex flex-1",
  typography: "text-start",
});

/*===== Popup Styles =====*/

const twPositionerStyles = defineStyles({
  layout: "isolate z-50",
});

const twPopupStyles = defineStyles({
  layout: "relative isolate z-50 overflow-x-hidden overflow-y-auto",
  // Base UI provides the available height, trigger width, and transform origin as CSS variables.
  geometry:
    "max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) rounded-housing border p-1",
  // A small module lifted off the housing: its own hard ledge and soft shadow (`shadow-md`), and a printed seam
  appearance: "border-border bg-popover text-popover-foreground shadow-md",
  state:
    "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  stateSide:
    "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  // A popup aligned over its trigger opens in place, so a slide would look like a jump.
  stateAligned: "data-[align-trigger=true]:animate-none",
});

const twScrollArrowStyles = defineStyles({
  layout: "z-10 flex w-full items-center justify-center",
  geometry: "py-1",
  appearance: "bg-popover",
  interaction: "cursor-default",
  icon: "[&_svg:not([class*='size-'])]:size-4",
});

/*===== Item Styles =====*/

const twGroupStyles = defineStyles({
  geometry: "scroll-my-1",
});

// Group names are printed markings, like the silkscreen beside a row of keys
const twLabelStyles = defineStyles({
  geometry: "px-2.5 pt-2 pb-1",
  typography: markingClasses,
});

const twItemStyles = defineStyles({
  layout: "relative flex w-full items-center gap-1.5",
  // A trailing span (such as a shortcut hint) lays out its own children in a row.
  layoutTrailing: "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  // `pe-8` reserves room for the absolutely positioned LED indicator.
  geometry: "min-h-10 rounded-keycap-compact py-2 ps-2.5 pe-8",
  typography: "text-body-sm",
  // The chosen item is printed heavier as well as lit, so the choice never rests on colour alone
  state: "data-selected:font-semibold",
  interaction: "cursor-default outline-hidden select-none",
  // Only the item's own ink changes; forcing it onto descendants would also recolour the selection LED
  focus: "focus:bg-accent focus:text-accent-foreground",
  disabled: "data-disabled:pointer-events-none data-disabled:opacity-45",
  icon: "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
});

const twItemTextStyles = defineStyles({
  layout: "flex flex-1 shrink-0 gap-2",
  typography: "whitespace-nowrap",
});

// The selected item lights a blue (selection) LED instead of a check mark
const twItemIndicatorStyles = defineStyles({
  layout: "absolute inset-e-3 flex items-center justify-center",
  geometry: "size-4",
  interaction: "pointer-events-none",
});

const twSeparatorStyles = defineStyles({
  geometry: "mx-1.5 my-1 h-px",
  appearance: "bg-border",
  interaction: "pointer-events-none",
});

/*===== Class Composition =====*/

const selectTriggerVariants = cva(joinStyles(twTriggerStyles), {
  variants: { variant: composeStyles(twTriggerVariant), size: composeStyles(twTriggerSize) },
  defaultVariants: { variant: "field", size: "default" },
});

const selectTriggerIconClasses = joinStyles(twTriggerIconStyles);
const selectValueClasses = joinStyles(twValueStyles);
const selectPositionerClasses = joinStyles(twPositionerStyles);
const selectPopupClasses = joinStyles(twPopupStyles);
const selectScrollArrowClasses = joinStyles(twScrollArrowStyles);
const selectGroupClasses = joinStyles(twGroupStyles);
const selectLabelClasses = joinStyles(twLabelStyles);
const selectItemClasses = joinStyles(twItemStyles);
const selectItemTextClasses = joinStyles(twItemTextStyles);
const selectItemIndicatorClasses = joinStyles(twItemIndicatorStyles);
const selectSeparatorClasses = joinStyles(twSeparatorStyles);

export {
  selectTriggerVariants,
  selectTriggerIconClasses,
  selectValueClasses,
  selectPositionerClasses,
  selectPopupClasses,
  selectScrollArrowClasses,
  selectGroupClasses,
  selectLabelClasses,
  selectItemClasses,
  selectItemTextClasses,
  selectItemIndicatorClasses,
  selectSeparatorClasses,
  twTriggerSize,
  twTriggerVariant,
};
