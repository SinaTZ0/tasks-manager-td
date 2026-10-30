import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "../field/field";
import { DatePicker } from "./date-picker";

/*===== Meta =====*/
const meta = {
  title: "Primitive/DatePicker",
  component: DatePicker,
  args: { value: null, onChange: () => {} },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
// Open the field: picking a day closes the calendar and prints the day in the reader's calendar.
export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>(args.value);
    return (
      <Field>
        <FieldLabel htmlFor="due-date">سررسید</FieldLabel>
        <DatePicker {...args} id="due-date" value={value} onChange={setValue} />
        <FieldDescription>{value ?? "—"}</FieldDescription>
      </Field>
    );
  },
};

// A chosen day, with the clear key at the end of the plate.
export const Filled: Story = {
  ...Playground,
  args: { value: "2026-10-30" },
};

// The cut turns yellow while the field is invalid and unfocused; FieldError says why in words.
export const Invalid: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="due-invalid">سررسید</FieldLabel>
      <DatePicker id="due-invalid" value="2026-09-01" onChange={() => {}} aria-invalid aria-describedby="due-error" />
      <FieldError id="due-error">تاریخ گذشته است.</FieldError>
    </Field>
  ),
};

export const Disabled: Story = {
  args: { value: "2026-10-30", disabled: true },
};
