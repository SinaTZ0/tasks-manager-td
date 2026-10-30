import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { markingClasses, readoutClasses } from "../instrument.styles";
import { Slider } from "./slider";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Slider",
  component: Slider,
  args: { "aria-label": "تخمین زمان", defaultValue: 60, min: 15, max: 240, step: 15 },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {
  render: (args) => (
    <div className="w-80">
      <Slider {...args} />
    </div>
  ),
};

// A fader with a printed name and a mono readout. In Persian the slot fills from the right.
export const WithReadout: Story = {
  render: function WithReadoutStory() {
    const [minutes, setMinutes] = useState(90);

    return (
      <div className="flex w-80 flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className={markingClasses}>تخمین</span>
          <output className={readoutClasses}>
            <bdi dir="ltr">{minutes}m</bdi>
          </output>
        </div>
        <Slider
          aria-label="تخمین زمان"
          value={minutes}
          min={15}
          max={240}
          step={15}
          onValueChange={(next) => setMinutes(Array.isArray(next) ? (next[0] ?? 15) : next)}
        />
      </div>
    );
  },
};

// An array value draws one cap per value.
export const Range: Story = {
  render: () => (
    <div className="w-80">
      <Slider aria-label="بازه" defaultValue={[20, 70]} />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="h-48">
      <Slider aria-label="سطح" defaultValue={40} orientation="vertical" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-80">
      <Slider aria-label="تخمین زمان" defaultValue={45} disabled />
    </div>
  ),
};
