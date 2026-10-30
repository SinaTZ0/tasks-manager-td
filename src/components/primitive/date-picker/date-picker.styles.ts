import { fieldPlateClasses, nativeControlClasses } from "../input/input.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Field =====*/

// The same recessed plate in a cut as a text field (input.styles.ts), 44px tall like it, so a date sits in a form
// row with the others. Focus on the trigger lights the cut orange, an invalid value yellow, exactly as on an input.
const twFieldStyles = defineStyles({
  geometry: "h-11 pe-1.5",
});

// The trigger fills the plate, transparent, like the native control of an input. The calendar icon leads; the text
// starts where an input's would.
const twTriggerStyles = defineStyles({
  layout: "flex items-center gap-2",
  geometry: "ps-4 pe-2",
  typography: "text-start",
  interaction: "cursor-pointer",
  icon: "[&_svg]:size-4.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
});

const twValueStyles = defineStyles({
  layout: "min-w-0 flex-1 truncate",
  state: "data-placeholder:text-muted-foreground",
});

/*===== Popover =====*/

// The module hugs the calendar instead of the popover's default width; "today" is printed under it.
const twContentStyles = defineStyles({
  geometry: "w-auto p-3",
});

const twFooterStyles = defineStyles({
  layout: "flex justify-center",
  geometry: "border-t border-border pt-3",
});

/*===== Class Composition =====*/

const datePickerClasses = `${fieldPlateClasses} ${joinStyles(twFieldStyles)}`;
const datePickerTriggerClasses = `${nativeControlClasses} ${joinStyles(twTriggerStyles)}`;
const datePickerValueClasses = joinStyles(twValueStyles);
const datePickerContentClasses = joinStyles(twContentStyles);
const datePickerFooterClasses = joinStyles(twFooterStyles);

export {
  datePickerClasses,
  datePickerContentClasses,
  datePickerFooterClasses,
  datePickerTriggerClasses,
  datePickerValueClasses,
};
