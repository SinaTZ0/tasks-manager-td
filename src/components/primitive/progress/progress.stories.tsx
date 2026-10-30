import type { Meta, StoryObj } from "@storybook/react-vite";

import { Progress, ProgressLabel, ProgressValue } from "./progress";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Progress",
  component: Progress,
  args: { value: 45 },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    threshold: { control: { type: "range", min: 0, max: 100 } },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {
  render: (args) => (
    <Progress {...args} className="w-80">
      <ProgressLabel>پیشرفت</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
};

// Time spent against the estimate: the tick marks the plan, and segments past it light orange.
export const AgainstEstimate: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-6">
      <Progress value={40} max={90} threshold={60} getAriaValueText={() => "۴۰ از ۶۰ دقیقه"}>
        <ProgressLabel>زمان صرف‌شده</ProgressLabel>
        <ProgressValue>{() => <bdi dir="ltr">40 / 60m</bdi>}</ProgressValue>
      </Progress>
      <Progress value={78} max={90} threshold={60} getAriaValueText={() => "۷۸ از ۶۰ دقیقه"}>
        <ProgressLabel>از تخمین گذشته</ProgressLabel>
        <ProgressValue>{() => <bdi dir="ltr">78 / 60m</bdi>}</ProgressValue>
      </Progress>
    </div>
  ),
};

export const Levels: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      {[0, 25, 60, 100].map((value) => (
        <Progress key={value} value={value} aria-label={`${value}%`} />
      ))}
    </div>
  ),
};

/** No value yet: a lit block sweeps toward the end of the reading direction. Under reduced motion it holds still. */
export const Indeterminate: Story = {
  render: () => (
    <Progress value={null} className="w-80">
      <ProgressLabel>بارگذاری</ProgressLabel>
    </Progress>
  ),
};
