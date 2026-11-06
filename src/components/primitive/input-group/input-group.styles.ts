import { cva } from "class-variance-authority";
import { twFieldPlate, twNativeControl } from "../input/input.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Group Styles =====*/

// The group is the field plate (input.styles.ts) with its control and addons inside, so the cut wraps the addons
// too. Its control is bare, and the group reacts to the control's state.
const twGroupStyles = defineStyles({
  ...twFieldPlate,
  layout: "group/input-group relative isolate flex w-full min-w-0 items-center",
  // Block-aligned addons and textareas stack vertically, so the fixed height gives way.
  layoutBlock:
    "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
  geometryHeight: "h-11",
  // The input yields padding on the side an addon occupies.
  geometryAddon:
    "has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
  // Same signals as a single field: orange cut on focus, yellow while invalid and unfocused.
  focus: "has-[[data-slot=input-group-control]:focus-visible]:before:bg-cut-focus",
  invalid: "has-[[data-slot=input-group-control][aria-invalid=true]:not(:focus-visible)]:before:bg-signal-attention",
  disabled: "has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:after:bg-field-disabled",
  // Inside a combobox popup the popup itself shows focus, so the cut stays dark.
  focusCombobox: "in-data-[slot=combobox-content]:before:bg-cut",
});

// `glass` is the field on the header's strip of display glass: a paler pane of the glass, with no cut or plate. With no
// cut to light, focus draws the same orange as an outline.
const twGroupVariant = defineStyles({
  plate: {},
  glass: {
    geometry: "h-8 rounded-chassis",
    appearance: "bg-glass-foreground/10 before:hidden after:hidden",
    focus:
      "has-[[data-slot=input-group-control]:focus-visible]:bg-glass-foreground/16 has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-cut-focus has-[[data-slot=input-group-control]:focus-visible]:outline-solid",
  },
});

/*===== Addon Styles =====*/

// Addons are printed on the plate: icons and units in the muted ink, never their own cut.
const twAddonStyles = defineStyles({
  layout: "flex items-center justify-center gap-2",
  geometry: "h-auto py-1.5",
  typography: "font-heading text-body-sm font-medium",
  appearance: "text-muted-foreground",
  appearanceGlass: "group-data-[variant=glass]/input-group:text-glass-muted",
  interaction: "cursor-text select-none",
  disabled: "group-has-disabled/input-group:opacity-45",
  icon: "[&>svg:not([class*='size-'])]:size-4.5",
});

// Keys inside an addon keep a gap from the plate edge so their own cut never touches the field's cut.
const twAddonAlign = defineStyles({
  "inline-start": {
    layout: "order-first",
    geometry: "ps-4 has-[>button]:ps-2",
    geometryGlass: "group-data-[variant=glass]/input-group:ps-2.5",
  },
  "inline-end": {
    layout: "order-last",
    geometry: "pe-4 has-[>button]:pe-2",
    geometryGlass: "group-data-[variant=glass]/input-group:pe-2.5",
  },
  "block-start": {
    layout: "order-first w-full justify-start",
    geometry: "px-4 pt-2.5 [.border-b]:pb-2",
  },
  "block-end": {
    layout: "order-last w-full justify-start",
    geometry: "px-4 pb-2.5 [.border-t]:pt-2",
  },
});

/*===== Button Styles =====*/

// InputGroupButton is a compact Button; these only tighten it for the plate.
const twButtonStyles = defineStyles({
  layout: "flex items-center gap-1.5",
});

const twButtonSize = defineStyles({
  xs: {
    geometry: "px-2",
  },
  sm: {},
  "icon-xs": {},
  "icon-sm": {
    geometry: "size-9",
  },
});

/*===== Text Styles =====*/

// Units and counters printed on the plate. Not the mono face: it has no Persian glyphs, and letter-spacing would break
// Persian letter joining.
const twTextStyles = defineStyles({
  layout: "flex items-center gap-2",
  typography: "font-heading text-body-sm font-medium",
  appearance: "text-muted-foreground",
  icon: "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
});

/*===== Control Styles =====*/

// Controls are the bare native element: the group draws the plate, the cut and every state.
const twInputStyles = defineStyles({
  ...twNativeControl,
  layout: "h-full min-w-0 flex-1",
  geometry: "rounded-[inherit] border-0 px-4",
  // The browser's own clear button is drawn for a light plate, so the glass drops it; Escape still clears.
  appearanceGlass:
    "group-data-[variant=glass]/input-group:text-glass-foreground group-data-[variant=glass]/input-group:placeholder:text-glass-muted md:group-data-[variant=glass]/input-group:text-body-sm group-data-[variant=glass]/input-group:[&::-webkit-search-cancel-button]:appearance-none",
});

const twTextareaStyles = defineStyles({
  ...twNativeControl,
  layout: "field-sizing-content min-h-24 w-full flex-1",
  geometry: "rounded-[inherit] border-0 px-4 py-3",
  interaction: "resize-none outline-none",
});

/*===== Class Composition =====*/

const inputGroupVariants = cva(joinStyles(twGroupStyles), {
  variants: { variant: composeStyles(twGroupVariant) },
  defaultVariants: { variant: "plate" },
});

const inputGroupAddonVariants = cva(joinStyles(twAddonStyles), {
  variants: { align: composeStyles(twAddonAlign) },
  defaultVariants: { align: "inline-start" },
});

const inputGroupButtonVariants = cva(joinStyles(twButtonStyles), {
  variants: { size: composeStyles(twButtonSize) },
  defaultVariants: { size: "xs" },
});

const inputGroupTextClasses = joinStyles(twTextStyles);
const inputGroupInputClasses = joinStyles(twInputStyles);
const inputGroupTextareaClasses = joinStyles(twTextareaStyles);

export {
  inputGroupAddonVariants,
  inputGroupButtonVariants,
  inputGroupVariants,
  inputGroupTextClasses,
  inputGroupInputClasses,
  inputGroupTextareaClasses,
  twAddonAlign,
  twButtonSize,
};
