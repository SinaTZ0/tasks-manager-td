import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "@daypicker/react";

import { isoToDate } from "#/lib/locale";

import { Calendar } from "./calendar";

/*===== Meta =====*/
// Switch the toolbar locale: Persian shows the Jalali calendar, right to left from Saturday; English the Gregorian one.
const meta = {
  title: "Primitive/Calendar",
  component: Calendar,
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const DUE = isoToDate("2026-10-30");

/*===== Stories =====*/
// Pick a day: it latches and lights its blue LED. Arrow keys move between days, Page Up/Down between months.
export const Single: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(DUE);
    return <Calendar mode="single" selected={selected} onSelect={setSelected} defaultMonth={DUE} />;
  },
};

// Today has a printed rule under its number.
export const Empty: Story = {
  render: () => <Calendar mode="single" />,
};

// Past days are dead keys, as for a due date that can't be in the past.
export const DisabledDays: Story = {
  render: () => (
    <Calendar mode="single" defaultMonth={DUE} selected={DUE} disabled={{ before: isoToDate("2026-10-20") }} />
  ),
};

// The days between the ends of a range latch without lighting.
export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>({
      from: isoToDate("2026-10-24"),
      to: isoToDate("2026-10-29"),
    });
    return <Calendar mode="range" selected={range} onSelect={setRange} defaultMonth={DUE} />;
  },
};
