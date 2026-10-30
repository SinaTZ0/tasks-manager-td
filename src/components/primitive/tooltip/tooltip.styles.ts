import { defineStyles, joinStyles } from "../styles";

/*===== Popup Styles =====*/

const twPositionerStyles = defineStyles({
  layout: "isolate z-50",
});

// A tooltip is a small strip of display glass: dark, mono-friendly, with a near-square corner like the cuts. No arrow:
// the 6px offset and the trigger beside it already say what it belongs to, and a rotated square reads as web chrome.
const twContentStyles = defineStyles({
  layout: "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5",
  geometry: "rounded-chassis px-2.5 py-1",
  // Tightens the end padding when the tooltip ends with a keyboard shortcut.
  geometryKbd: "has-data-[slot=kbd]:pe-1",
  typography: "font-heading text-caption",
  // No shadow: a near-black strip already separates from the housing, and a ledge under glass reads as a key.
  appearance: "bg-glass text-glass-foreground",
  state:
    "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  motion: "motion-reduce:animate-none",
});

/*===== Class Composition =====*/

const tooltipPositionerClasses = joinStyles(twPositionerStyles);
const tooltipContentClasses = joinStyles(twContentStyles);

export { tooltipPositionerClasses, tooltipContentClasses };
