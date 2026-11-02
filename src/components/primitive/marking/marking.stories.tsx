import type { Meta, StoryObj } from "@storybook/react-vite";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "./marking";
import { twVariant } from "./marking.styles";

const variantOptions = Object.keys(twVariant) as Array<keyof typeof twVariant>;

/*===== Meta =====*/
const meta = {
  title: "Primitive/Marking",
  component: Marking,
  args: { children: "وضعیت کار" },
  argTypes: {
    variant: { control: "select", options: variantOptions },
  },
} satisfies Meta<typeof Marking>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// Codes stay left to right inside Persian text.
export const InContext: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <span className="flex items-center justify-between gap-6">
        <Marking>ستون در حال انجام</Marking>
        <Marking variant="code">04/03</Marking>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="attention" state="blink" size="sm" />
        <Marking>منتظر</Marking>
        <Marking variant="code">TD-42</Marking>
      </span>
      <span className="flex items-center gap-2">
        <Marking>میانبر</Marking>
        <Marking variant="code">Ctrl+K</Marking>
      </span>
      <span className="flex items-center gap-2">
        <Marking>چک‌لیست</Marking>
        <Marking variant="reading">۱/۲</Marking>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="positive" state="blink" size="sm" />
        <Marking>زمان</Marking>
        <Marking variant="clock">۰:۲۴:۰۳</Marking>
      </span>
    </div>
  ),
};
