import { CalendarIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { formatDate, isoToDate } from "#/lib/locale";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

import { Button } from "../button/button";
import { Calendar } from "../calendar/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover";
import {
  datePickerClasses,
  datePickerContentClasses,
  datePickerFooterClasses,
  datePickerTriggerClasses,
  datePickerValueClasses,
} from "./date-picker.styles";

/*===== Dates =====*/

/**
 * A picked day as ISO (`2026-10-30`). Read from the `Date`'s local fields: DayPicker hands back local midnight, and
 * `isoToDate`'s UTC noon is the same local day in every time zone from −11 to +11, so a value never shifts a day.
 */
function dateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/*===== Date Picker =====*/

export type DatePickerProps = {
  /** The chosen day as ISO (`2026-10-30`), or `null` for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Put on the trigger, so a `FieldLabel htmlFor` names it. */
  id?: string;
  disabled?: boolean;
  /** Shown while no day is chosen. Defaults to «انتخاب تاریخ». */
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** Layout only (width, margins, grid placement), as on an input. */
  className?: string;
};

/**
 * A date field: a field plate whose face opens a calendar (shadcn's Date Picker: a Popover around a Calendar). The day
 * prints in the reader's calendar, Jalali in Persian. Picking a day closes the calendar; a small key at the end of the
 * plate clears it. The value is a plain ISO day, with no time and no time zone.
 */
function DatePicker({
  value,
  onChange,
  id,
  disabled,
  placeholder,
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToDate(value) : undefined;

  const choose = (date: Date | undefined) => {
    onChange(date ? dateToIso(date) : null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span data-slot="date-picker" className={cn(datePickerClasses, className)}>
        {/*------ Trigger ------*/}
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-slot="date-picker-trigger"
          className={datePickerTriggerClasses}
        >
          <CalendarIcon aria-hidden="true" />
          <span data-placeholder={selected ? undefined : ""} className={datePickerValueClasses}>
            {selected ? formatDate(selected) : (placeholder ?? m.date_field_placeholder())}
          </span>
        </PopoverTrigger>

        {/*------ Clear ------*/}
        {value && !disabled && (
          <Button variant="ghost" size="icon-xs" aria-label={m.date_field_clear()} onClick={() => onChange(null)}>
            <XIcon />
          </Button>
        )}
      </span>

      {/*------ Calendar ------*/}
      <PopoverContent align="start" className={datePickerContentClasses}>
        {/* The calendar only opens on the person's own press, so its focus goes straight to the chosen day (or today),
            where the arrow keys work, instead of the month's nav key. */}
        {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={choose} autoFocus />
        <div className={datePickerFooterClasses}>
          <Button variant="secondary" size="xs" onClick={() => choose(new Date())}>
            {m.date_field_today()}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
