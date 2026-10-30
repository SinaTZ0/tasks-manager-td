import { defineStyles, joinStyles } from "../styles";

/*===== Overlay =====*/

// The scrim is the cut colour, thinned: the page sinks into shadow behind the lifted module, in both themes.
const twOverlayStyles = defineStyles({
  layout: "fixed inset-0 z-50",
  appearance: "bg-cut/45",
  interaction: "transition-opacity duration-150",
  state: "data-ending-style:opacity-0 data-starting-style:opacity-0",
});

/*===== Content =====*/

// A sheet is a module lifted off the desk: popover material, a thin shell edge on the side facing the page, and the
// `md` ledge-plus-shadow. Sheets slide in from their edge. Base UI's `starting`/`ending` styles drive the transition, and the `rtl:` pairs
// flip the horizontal offset so a `start` sheet always travels from its own edge.
const twContentStyles = defineStyles({
  layout: "fixed z-50 flex flex-col gap-4",
  appearance: "border-border bg-popover bg-clip-padding text-popover-foreground shadow-md",
  typography: "text-body-sm",
  interaction: "transition duration-200 ease-in-out",
  state: "data-ending-style:opacity-0 data-starting-style:opacity-0",
  // The top/bottom edges are full width; start/end edges are a side panel capped at 24rem.
  stateBottom:
    "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:rounded-t-housing data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10",
  stateTop:
    "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:rounded-b-housing data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10",
  stateStart:
    "data-[side=start]:inset-y-0 data-[side=start]:inset-s-0 data-[side=start]:h-full data-[side=start]:w-[min(88vw,24rem)] data-[side=start]:border-e data-[side=start]:data-ending-style:translate-x-10 data-[side=start]:data-starting-style:translate-x-10 ltr:data-[side=start]:data-ending-style:-translate-x-10 ltr:data-[side=start]:data-starting-style:-translate-x-10",
  stateEnd:
    "data-[side=end]:inset-y-0 data-[side=end]:inset-e-0 data-[side=end]:h-full data-[side=end]:w-[min(88vw,24rem)] data-[side=end]:border-s data-[side=end]:data-ending-style:-translate-x-10 data-[side=end]:data-starting-style:-translate-x-10 ltr:data-[side=end]:data-ending-style:translate-x-10 ltr:data-[side=end]:data-starting-style:translate-x-10",
  motion: "motion-reduce:transition-none",
});

const twCloseStyles = defineStyles({
  layout: "absolute inset-e-3 top-3",
});

/*===== Parts =====*/

// Header and footer are printed strips ruled off from the body, like a card's
const twHeaderStyles = defineStyles({
  layout: "flex flex-col gap-1",
  geometry: "border-b p-6 pe-16",
  appearance: "border-border",
});
const twFooterStyles = defineStyles({
  layout: "mt-auto flex flex-col gap-2",
  geometry: "border-t p-6",
  appearance: "border-border",
});
const twTitleStyles = defineStyles({ typography: "font-heading text-h4", appearance: "text-foreground" });
const twDescriptionStyles = defineStyles({ typography: "text-body-sm", appearance: "text-muted-foreground" });

export const sheetOverlayClasses = joinStyles(twOverlayStyles);
export const sheetContentClasses = joinStyles(twContentStyles);
export const sheetCloseClasses = joinStyles(twCloseStyles);
export const sheetHeaderClasses = joinStyles(twHeaderStyles);
export const sheetFooterClasses = joinStyles(twFooterStyles);
export const sheetTitleClasses = joinStyles(twTitleStyles);
export const sheetDescriptionClasses = joinStyles(twDescriptionStyles);
