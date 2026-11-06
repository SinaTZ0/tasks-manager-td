import { keycapVariants, markingClasses } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

// The calendar is printed on whatever housing holds it (a popover, a card): no panel of its own. `--cell-size` is a
// compact key, the size every day, weekday heading and nav key share, so the grid lines up column by column.
const twRootStyles = defineStyles({
  layout: "group/calendar relative w-fit",
  geometry: "p-1 [--cell-size:--spacing(8)] pointer-coarse:[--cell-size:--spacing(10)]",
});

/*===== Header =====*/

// The month's name is printed centred between the two nav keys, on one row with them.
const twMonthsStyles = defineStyles({ layout: "relative flex flex-col gap-4" });
const twMonthStyles = defineStyles({ layout: "flex w-full flex-col gap-3" });

const twNavStyles = defineStyles({
  layout: "absolute inset-x-0 top-0 flex items-center justify-between",
  geometry: "h-(--cell-size) px-0.5",
});

const twMonthCaptionStyles = defineStyles({
  layout: "flex items-center justify-center",
  geometry: "h-(--cell-size) px-(--cell-size)",
});

const twCaptionLabelStyles = defineStyles({
  typography: "font-heading text-h4 select-none",
  appearance: "text-foreground",
});

// The nav keys are compact light keys; DayPicker marks the end of a range with `aria-disabled` rather than `disabled`.
const twNavButtonStyles = defineStyles({
  appearance: keycapVariants({ tone: "light", scale: "compact" }),
  geometry: "size-(--cell-size) p-0",
  icon: "[&_svg]:size-4",
  disabled:
    "aria-disabled:cursor-not-allowed aria-disabled:text-muted-foreground aria-disabled:after:opacity-70 aria-disabled:after:grayscale",
});

/*===== Grid =====*/

// The days sit in a table whose spacing is the gap between their cuts, like keys on a pad.
const twMonthGridStyles = defineStyles({
  layout: "border-separate",
  geometry: "border-spacing-1.5",
});

const twWeekdayStyles = defineStyles({
  geometry: "h-6 w-(--cell-size) p-0",
  typography: `${markingClasses} font-normal`,
});

const twDayStyles = defineStyles({
  layout: "relative p-0 text-center",
  geometry: "size-(--cell-size)",
});

/*===== Day Key =====*/

// Every day is a compact light key. The chosen day latches (sinks, `data-pressed`), turns to a graphite cap
// (`data-chosen`), since a sunk light key alone is hard to tell at 32px, and lights a blue selection LED; days inside a
// chosen range only latch. Today carries a printed rule under its number, so it is found
// without colour (`calendarDayTodayClasses`). Days of the next and previous months are plates flush with the housing, printed muted.
const twDayButtonStyles = defineStyles({
  appearance: keycapVariants({ tone: "light", scale: "compact" }),
  geometry: "size-(--cell-size) p-0",
  typography: "font-sans text-body-sm font-medium tabular-nums",
  state:
    "data-chosen:text-keycap-graphite-foreground data-chosen:after:bg-keycap-graphite data-outside:text-muted-foreground data-outside:after:bg-card data-outside:after:shadow-none",
  disabled:
    "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:after:opacity-70 disabled:after:grayscale",
});

// Inside the key's corner, like the LED printed on a sampler pad.
const twDayLedStyles = defineStyles({ layout: "absolute end-1.5 top-1.5" });

// Today's printed rule, under the number.
const twDayTodayStyles = defineStyles({
  layout: "absolute inset-x-2.5 bottom-1",
  geometry: "h-0.5 rounded-full",
  appearance: "bg-current",
});

const twHiddenStyles = defineStyles({ layout: "invisible" });

/*===== Class Composition =====*/

const calendarClasses = joinStyles(twRootStyles);
const calendarMonthsClasses = joinStyles(twMonthsStyles);
const calendarMonthClasses = joinStyles(twMonthStyles);
const calendarNavClasses = joinStyles(twNavStyles);
const calendarMonthCaptionClasses = joinStyles(twMonthCaptionStyles);
const calendarCaptionLabelClasses = joinStyles(twCaptionLabelStyles);
const calendarNavButtonClasses = joinStyles(twNavButtonStyles);
const calendarMonthGridClasses = joinStyles(twMonthGridStyles);
const calendarWeekdayClasses = joinStyles(twWeekdayStyles);
const calendarDayClasses = joinStyles(twDayStyles);
const calendarDayButtonClasses = joinStyles(twDayButtonStyles);
const calendarDayLedClasses = joinStyles(twDayLedStyles);
const calendarDayTodayClasses = joinStyles(twDayTodayStyles);
const calendarHiddenClasses = joinStyles(twHiddenStyles);

export {
  calendarCaptionLabelClasses,
  calendarClasses,
  calendarDayButtonClasses,
  calendarDayClasses,
  calendarDayLedClasses,
  calendarDayTodayClasses,
  calendarHiddenClasses,
  calendarMonthCaptionClasses,
  calendarMonthClasses,
  calendarMonthGridClasses,
  calendarMonthsClasses,
  calendarNavButtonClasses,
  calendarNavClasses,
  calendarWeekdayClasses,
};
