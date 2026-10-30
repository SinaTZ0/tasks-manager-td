import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
import { twTriggerSize, twTriggerVariant } from "./select.styles";

const sizeOptions = Object.keys(twTriggerSize) as Array<keyof typeof twTriggerSize>;
const variantOptions = Object.keys(twTriggerVariant) as Array<keyof typeof twTriggerVariant>;

/*===== Data =====*/
const statuses = [
  { value: "backlog", label: "انباشته" },
  { value: "todo", label: "برای انجام" },
  { value: "doing", label: "در حال انجام" },
  { value: "review", label: "بازبینی" },
  { value: "done", label: "انجام‌شده" },
];

/*===== Meta =====*/
const meta = {
  title: "Primitive/Select",
  component: SelectTrigger,
  argTypes: {
    variant: { control: "inline-radio", options: variantOptions },
    size: { control: "inline-radio", options: sizeOptions },
  },
  args: { variant: "field", size: "default" },
  render: (args) => (
    <Select items={statuses}>
      <SelectTrigger {...args} className="w-full max-w-sm" aria-label="وضعیت">
        <SelectValue placeholder="وضعیت" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof SelectTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// A chosen value; open it to see the lit selection LED on the chosen item.
export const Selected: Story = {
  render: (args) => (
    <Select items={statuses} defaultValue="doing">
      <SelectTrigger {...args} className="w-full max-w-sm" aria-label="وضعیت">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

// `sm` is a compact part: a smaller radius and a narrower cut.
export const Small: Story = {
  args: { size: "sm" },
};

export const Grouped: Story = {
  render: (args) => (
    <Select items={statuses}>
      <SelectTrigger {...args} className="w-full max-w-sm" aria-label="وضعیت">
        <SelectValue placeholder="وضعیت" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>باز</SelectLabel>
          {statuses.slice(0, 4).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>بسته</SelectLabel>
          {statuses.slice(4).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

// A key that sets a view rather than a value, as in the board's filter row
export const Key: Story = {
  args: { variant: "key", size: "sm" },
};

export const Invalid: Story = {
  args: { "aria-invalid": true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
