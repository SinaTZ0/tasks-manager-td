import { twCut } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Kbd =====*/

// A key legend printed on a tiny keycap, so a shortcut looks like the key you press. Not interactive: no hover,
// press or focus. The face is on `::after` because the cut's `::before` would paint over a root background.
const twKbdStyles = defineStyles({
  layout: "pointer-events-none relative isolate inline-flex w-fit items-center justify-center gap-1 select-none",
  geometry: "h-6 min-w-6 rounded-keycap-compact px-1.5",
  typography: "font-mono text-caption font-medium",
  appearance: "text-keycap-foreground",
  appearanceFace:
    "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:bg-keycap after:shadow-keycap-compact",
  appearanceCut: joinStyles(twCut.compact),
  icon: "[&_svg:not([class*='size-'])]:size-3",
});

// Keys in a chord keep their own cuts, so they need a gap wider than two cut widths
const twKbdGroupStyles = defineStyles({
  layout: "inline-flex items-center gap-1.5",
});

/*===== Class Composition =====*/

const kbdClasses = joinStyles(twKbdStyles);
const kbdGroupClasses = joinStyles(twKbdGroupStyles);

export { kbdClasses, kbdGroupClasses };
