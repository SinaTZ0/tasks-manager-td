import { defineStyles, joinStyles } from "../styles";

/*===== Overlay =====*/

// The desk dims under a dialog, as if a module were lifted off it into the light
const twOverlayStyles = defineStyles({
  layout: "fixed inset-0 isolate z-50",
  appearance: "bg-cut/45",
  interaction: "transition-opacity duration-150",
  state: "data-ending-style:opacity-0 data-starting-style:opacity-0",
  motion: "motion-reduce:transition-none",
});

/*===== Content =====*/

// A lifted module: the housing material with its molded ledge and a soft shadow, square-cornered like the panels.
// `-translate-x-1/2` centres from the start edge, so RTL flips it.
const twContentStyles = defineStyles({
  layout: "fixed start-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-6 rtl:translate-x-1/2",
  geometry: "max-w-[calc(100%-2rem)] rounded-housing border p-6 sm:max-w-md",
  appearance: "border-border bg-popover text-popover-foreground shadow-md",
  typography: "text-body-sm",
  interaction: "transition-[opacity,scale] duration-150 ease-instrument outline-none",
  state:
    "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
  motion: "motion-reduce:transition-none",
});

// Sits in the module's top corner; the header leaves room for it with `pe-12`
const twCloseStyles = defineStyles({
  layout: "absolute end-4 top-4",
});

/*===== Parts =====*/

const twHeaderStyles = defineStyles({ layout: "flex flex-col gap-1.5", geometry: "pe-12" });
// Actions sit in a row at the end, with gaps wide enough to keep each key's cut separate
const twFooterStyles = defineStyles({ layout: "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" });
const twTitleStyles = defineStyles({ typography: "font-heading text-h3", appearance: "text-foreground" });
const twDescriptionStyles = defineStyles({
  typography: "text-body-sm",
  appearance: "text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
});

/*===== Class Composition =====*/

const dialogOverlayClasses = joinStyles(twOverlayStyles);
const dialogContentClasses = joinStyles(twContentStyles);
const dialogCloseClasses = joinStyles(twCloseStyles);
const dialogHeaderClasses = joinStyles(twHeaderStyles);
const dialogFooterClasses = joinStyles(twFooterStyles);
const dialogTitleClasses = joinStyles(twTitleStyles);
const dialogDescriptionClasses = joinStyles(twDescriptionStyles);

export {
  dialogCloseClasses,
  dialogContentClasses,
  dialogDescriptionClasses,
  dialogFooterClasses,
  dialogHeaderClasses,
  dialogOverlayClasses,
  dialogTitleClasses,
};
