import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { HoldKey, HoldKeyPlate } from "./hold-key";
import { twShape } from "./hold-key.styles";

const shapeOptions = Object.keys(twShape) as Array<keyof typeof twShape>;

/*===== Meta =====*/
const meta = {
  title: "Primitive/Hold Key",
  component: HoldKey,
  args: {
    label: "نگه دارید تا بپرسید TD-42 چطور پیش می‌رود",
    hint: "نگه دارید تا بپرسید کار چطور پیش می‌رود",
    shape: "inline",
    onFire: fn(),
  },
  argTypes: {
    shape: { control: "select", options: shapeOptions },
  },
} satisfies Meta<typeof HoldKey>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
// Hold it for half a second. A short press does nothing, and a press given up early drains the ring.
export const Playground: Story = {};

// The corner shape takes its height from where it stands, here a card's footer row.
export const InACorner: Story = {
  args: { shape: "corner" },
  render: (args) => (
    <div className="flex h-11 w-9.5">
      <HoldKey {...args} />
    </div>
  ),
};

// What a card carries through a drag: the same plate, with nothing to press.
export const Picture: Story = {
  render: () => <HoldKeyPlate shape="inline" />,
};
