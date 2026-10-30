import { markingClasses, readoutClasses } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Popup =====*/

// The popup is a small module lifted off the panel: popover material, a thin shell edge and the `md` ledge plus shadow.
const twContentStyles = defineStyles({
  layout:
    "z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none",
  geometry: "rounded-housing border p-1",
  appearance: "border-border bg-popover text-popover-foreground shadow-md",
  state:
    "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
  stateSide:
    "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=top]:slide-in-from-bottom-2",
  motion: "motion-reduce:animate-none",
});

const twSubContentStyles = defineStyles({
  layout: "w-auto min-w-24",
});

/*===== Items =====*/

// Rows are at least 40px tall (the tap-target floor). Selected and focused rows take the quiet `accent` wash.
const twItemStyles = defineStyles({
  layout: "group/dropdown-menu-item relative flex items-center gap-2",
  geometry: "min-h-10 rounded-keycap-compact px-3 py-2 data-inset:ps-8",
  typography: "text-body-sm",
  interaction: "cursor-default outline-hidden select-none",
  focus: "focus:bg-accent focus:text-accent-foreground",
  disabled: "data-disabled:pointer-events-none data-disabled:opacity-45",
  state: "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive-surface",
  icon: "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
});

const twSubTriggerStyles = defineStyles({
  state:
    "data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground",
});

// Checkbox and radio rows reserve the inline-end column for their LED. The LED is always there, unlit grey plastic
// when off, so the reader sees which rows are switchable before choosing.
// A suffixed group name, so spreading it over the item styles adds to `geometry` instead of replacing it (replacing
// it dropped the 40px row height and padding).
const twIndicatorItemStyles = defineStyles({
  geometryIndicator: "pe-9",
});

const twIndicatorStyles = defineStyles({
  layout: "pointer-events-none absolute inset-e-3 flex items-center justify-center",
});

const twLedStyles = defineStyles({
  state: "group-data-checked/dropdown-menu-item:bg-current group-data-checked/dropdown-menu-item:shadow-led-on",
});

// Group labels are printed markings, like a panel's silkscreen
const twLabelStyles = defineStyles({
  geometry: "px-3 pt-2 pb-1 data-inset:ps-8",
  typography: markingClasses,
});

const twSeparatorStyles = defineStyles({
  geometry: "-mx-1 my-1 h-px",
  appearance: "bg-border",
});

// Shortcuts are printed in the instrument mono, like key legends
const twShortcutStyles = defineStyles({
  layout: "ms-auto",
  typography: readoutClasses,
  appearance: "group-focus/dropdown-menu-item:text-accent-foreground",
});

export const dropdownMenuContentClasses = joinStyles(twContentStyles);
export const dropdownMenuSubContentClasses = joinStyles(twSubContentStyles);
export const dropdownMenuItemClasses = joinStyles(twItemStyles);
export const dropdownMenuSubTriggerClasses = joinStyles({ ...twItemStyles, ...twSubTriggerStyles });
export const dropdownMenuIndicatorItemClasses = joinStyles({ ...twItemStyles, ...twIndicatorItemStyles });
export const dropdownMenuIndicatorClasses = joinStyles(twIndicatorStyles);
export const dropdownMenuLedClasses = joinStyles(twLedStyles);
export const dropdownMenuLabelClasses = joinStyles(twLabelStyles);
export const dropdownMenuSeparatorClasses = joinStyles(twSeparatorStyles);
export const dropdownMenuShortcutClasses = joinStyles(twShortcutStyles);
