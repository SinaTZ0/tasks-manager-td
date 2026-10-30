import { DayPicker as PersianDayPicker } from "@daypicker/persian";
import { DayPicker, type DayButtonProps, type DayPickerProps } from "@daypicker/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { getLocale } from "#/paraglide/runtime";

import { Led } from "../led/led";
import {
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
} from "./calendar.styles";

/*===== Calendar =====*/

export type CalendarProps = DayPickerProps;

/**
 * A month of days as a pad of compact keys (shadcn's Calendar on DayPicker). In Persian it is the Jalali calendar:
 * right to left, Saturday first, Persian month names and digits (`@daypicker/persian`); in English the Gregorian one.
 * The chosen day latches and lights a blue selection LED; today has a printed rule under its number.
 *
 * Every DayPicker prop passes through (`mode`, `selected`, `onSelect`, `disabled`, `defaultMonth`…). Dates are plain
 * `Date`s in either calendar: only how they are shown changes.
 */
function Calendar({ className, classNames, showOutsideDays = true, components, ...props }: CalendarProps) {
  // DayPicker's props are a union per `mode`, so the shared object is assembled loosely and checked as a whole.
  const shared = {
    showOutsideDays,
    className: cn(calendarClasses, className),
    classNames: {
      months: calendarMonthsClasses,
      month: calendarMonthClasses,
      nav: calendarNavClasses,
      button_previous: calendarNavButtonClasses,
      button_next: calendarNavButtonClasses,
      month_caption: calendarMonthCaptionClasses,
      caption_label: calendarCaptionLabelClasses,
      month_grid: calendarMonthGridClasses,
      weekday: calendarWeekdayClasses,
      day: calendarDayClasses,
      hidden: calendarHiddenClasses,
      ...classNames,
    },
    components: { Chevron: CalendarChevron, DayButton: CalendarDayButton, ...components },
    ...props,
  } as DayPickerProps;

  // The Persian build defaults to the `fa-IR` Jalali locale, `rtl` and Persian digits.
  return getLocale() === "fa" ? (
    <PersianDayPicker data-slot="calendar" {...(shared as ComponentProps<typeof PersianDayPicker>)} />
  ) : (
    <DayPicker data-slot="calendar" {...shared} />
  );
}

/*===== Parts =====*/

// DayPicker already picks the orientation from the reading direction, so the arrows point the way the months move.
const CHEVRONS = { left: ChevronLeftIcon, right: ChevronRightIcon, up: ChevronUpIcon, down: ChevronDownIcon };

function CalendarChevron({
  orientation = "left",
  className,
}: {
  orientation?: keyof typeof CHEVRONS;
  className?: string;
}) {
  const Icon = CHEVRONS[orientation];
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * One day's key. It takes focus when DayPicker moves the keyboard focus to it (arrow keys), as DayPicker's own button
 * does. A chosen day is latched through `data-pressed`, which the keycap recipe sinks.
 */
function CalendarDayButton({ className, day: _day, modifiers, ...props }: DayButtonProps & ComponentProps<"button">) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const latched = modifiers.selected || modifiers.range_middle;
  const lit = modifiers.selected && !modifiers.range_middle;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="calendar-day"
      data-pressed={latched || undefined}
      data-chosen={lit || undefined}
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      {...props}
      className={cn(calendarDayButtonClasses, className)}
    >
      {props.children}
      {lit && <Led signal="selection" size="sm" className={calendarDayLedClasses} />}
      {modifiers.today && <span aria-hidden="true" className={calendarDayTodayClasses} />}
    </button>
  );
}

export { Calendar, CalendarDayButton };
