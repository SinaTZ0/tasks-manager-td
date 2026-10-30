import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../label/label";
import { Textarea } from "./textarea";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Textarea",
  component: Textarea,
  args: {
    placeholder: "نظر خود را بنویسید…",
    "aria-label": "نظر",
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="comment">نظر</Label>
      <Textarea {...args} id="comment" aria-label={undefined} />
    </div>
  ),
};

// The field grows with its content.
export const Filled: Story = {
  args: {
    defaultValue: "طرح جدید را دیدم. دکمه ورود در موبایل کمی پایین افتاده؛ قبل از ادغام درستش کنیم.",
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "این کار بسته شده و نظر تازه نمی‌پذیرد." },
};
