import type { Meta, StoryObj } from "@storybook/react-vite";

import { Led } from "#/components/primitive/led/led";
import { Display, DisplayLabel, DisplayValue } from "./display";
import { twSize } from "./display.styles";

const sizeOptions = Object.keys(twSize) as Array<keyof typeof twSize>;

/*===== Meta =====*/
const meta = {
  title: "Primitive/Display",
  component: Display,
  argTypes: {
    size: { control: "select", options: sizeOptions },
  },
} satisfies Meta<typeof Display>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/

// A task timer: the value is the brightest thing in the glass, its label and state print dimmer.
export const Timer: Story = {
  render: (args) => (
    <Display {...args} className="w-72">
      <div className="flex items-center justify-between">
        <DisplayLabel>زمان صرف‌شده</DisplayLabel>
        <span className="flex items-center gap-2">
          <Led signal="positive" state="blink" size="sm" />
          <DisplayLabel>در حال اجرا</DisplayLabel>
        </span>
      </div>
      <DisplayValue>01:24:07</DisplayValue>
    </Display>
  ),
};

// `sm` fits in a toolbar or a card footer.
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      {sizeOptions.map((size) => (
        <Display key={size} size={size}>
          <DisplayLabel>{size}</DisplayLabel>
          <DisplayValue>03/05</DisplayValue>
        </Display>
      ))}
    </div>
  ),
};
