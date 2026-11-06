import { defineStyles, joinStyles } from "../styles";

/*===== Positioner =====*/

const twPositionerStyles = defineStyles({
  layout: "isolate z-50",
});

/*===== Content =====*/

// A small module lifted off the panel: housing material, molded ledge and a soft shadow, like the dialog. It grows
// from the trigger (`--transform-origin`) so it reads as coming out of the part that opened it.
const twContentStyles = defineStyles({
  layout: "z-50 flex w-72 max-w-[calc(100vw-1rem)] origin-(--transform-origin) flex-col gap-4",
  geometry: "rounded-housing border p-4",
  appearance: "border-border bg-popover text-popover-foreground shadow-md",
  typography: "text-body-sm",
  interaction: "outline-hidden",
  state:
    "duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
});

/*===== Parts =====*/

const twHeaderStyles = defineStyles({ layout: "flex flex-col gap-1" });
const twTitleStyles = defineStyles({ typography: "font-heading text-h4", appearance: "text-foreground" });
const twDescriptionStyles = defineStyles({ typography: "text-body-sm", appearance: "text-muted-foreground" });

/*===== Class Composition =====*/

const popoverPositionerClasses = joinStyles(twPositionerStyles);
const popoverContentClasses = joinStyles(twContentStyles);
const popoverHeaderClasses = joinStyles(twHeaderStyles);
const popoverTitleClasses = joinStyles(twTitleStyles);
const popoverDescriptionClasses = joinStyles(twDescriptionStyles);

export {
  popoverContentClasses,
  popoverDescriptionClasses,
  popoverHeaderClasses,
  popoverPositionerClasses,
  popoverTitleClasses,
};
