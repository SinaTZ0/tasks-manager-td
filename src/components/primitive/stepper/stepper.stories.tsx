import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Stepper, StepperItem, type StepState } from "./stepper";

const STAGES = ["برای انجام", "در حال انجام", "بازبینی", "انجام‌شده"];

const stateOf = ({ index, current }: { index: number; current: number }): StepState =>
  index < current ? "complete" : index === current ? "current" : "upcoming";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Stepper",
  component: Stepper,
  args: { "aria-label": "وضعیت" },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/

// Printed only: a reader sees where the work is, and nothing moves it.
export const ReadOnly: Story = {
  render: (args) => (
    <Stepper {...args}>
      {STAGES.map((stage, index) => (
        <StepperItem key={stage} state={stateOf({ index, current: 1 })}>
          {stage}
        </StepperItem>
      ))}
    </Stepper>
  ),
};

// Someone works on the current stage: its LED blinks.
export const Live: Story = {
  render: (args) => (
    <Stepper {...args}>
      {STAGES.map((stage, index) => (
        <StepperItem key={stage} state={stateOf({ index, current: 1 })} live>
          {stage}
        </StepperItem>
      ))}
    </Stepper>
  ),
};

// Every stage but the current one is a key that moves the work there.
export const Pressable: Story = {
  render: function Render(args) {
    const [current, setCurrent] = useState(1);
    return (
      <div className="rounded-chassis bg-tray p-3 shadow-tray">
        <Stepper aria-label={args["aria-label"]}>
          {STAGES.map((stage, index) => (
            <StepperItem
              key={stage}
              state={stateOf({ index, current })}
              onSelect={() => setCurrent(index)}
              selectLabel={`انتقال به «${stage}»`}
            >
              {stage}
            </StepperItem>
          ))}
        </Stepper>
      </div>
    );
  },
};
