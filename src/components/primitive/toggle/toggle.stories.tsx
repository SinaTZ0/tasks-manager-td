import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoldIcon, CircleIcon, PauseIcon, TimerIcon } from "lucide-react";

import { Toggle } from "./toggle";
import { twSize, twVariant } from "./toggle.styles";

const variantOptions = Object.keys(twVariant) as Array<keyof typeof twVariant>;
const sizeOptions = Object.keys(twSize) as Array<keyof typeof twSize>;

/*===== Meta =====*/
const meta = {
  title: "Primitive/Toggle",
  component: Toggle,
  args: { children: "توقف خودکار" },
  argTypes: {
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    signal: { control: "select", options: ["action", "attention", "selection", "positive"] },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// Latched keys stay sunk and light their LED; press again to release.
export const States: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle {...args}>خاموش</Toggle>
      <Toggle {...args} defaultPressed>
        روشن
      </Toggle>
      <Toggle {...args} disabled>
        غیرفعال
      </Toggle>
      <Toggle {...args} defaultPressed disabled>
        روشن و غیرفعال
      </Toggle>
    </div>
  ),
};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {variantOptions.map((variant) => (
        <Toggle key={variant} {...args} variant={variant} defaultPressed={variant === "default"}>
          {variant}
        </Toggle>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {sizeOptions.map((size) => (
        <Toggle key={size} {...args} size={size} defaultPressed>
          {size}
        </Toggle>
      ))}
    </div>
  ),
};

// The LED colour states what the latch means: orange records, yellow holds attention, green runs.
export const Signals: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle signal="action" defaultPressed>
        <CircleIcon data-icon="inline-start" />
        ضبط زمان
      </Toggle>
      <Toggle signal="attention" defaultPressed>
        <PauseIcon data-icon="inline-start" />
        مکث
      </Toggle>
      <Toggle signal="positive" defaultPressed>
        <TimerIcon data-icon="inline-start" />
        در حال اجرا
      </Toggle>
    </div>
  ),
};

// Dense toolbars may drop the LED: the sunk face alone marks the state, and `aria-pressed` tells assistive tech.
export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle size="sm" indicator={false} aria-label="درشت">
        <BoldIcon />
      </Toggle>
      <Toggle size="sm" indicator={false} defaultPressed aria-label="درشت">
        <BoldIcon />
      </Toggle>
    </div>
  ),
};
