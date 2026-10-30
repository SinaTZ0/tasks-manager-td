import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlayIcon } from "lucide-react";

import { Button } from "../button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Tooltip",
  component: TooltipContent,
  args: { children: "شروع زمان‌سنج" },
  argTypes: {
    side: {
      control: "select",
      options: ["top", "bottom", "inline-start", "inline-end"],
    },
  },
  // `defaultOpen` keeps the tooltip visible; TooltipProvider comes from the Storybook preview.
  render: (args) => (
    <div className="flex justify-center p-16">
      <Tooltip defaultOpen>
        <TooltipTrigger render={<Button size="icon" variant="secondary" aria-label="شروع زمان‌سنج" />}>
          <PlayIcon />
        </TooltipTrigger>
        <TooltipContent {...args} />
      </Tooltip>
    </div>
  ),
} satisfies Meta<typeof TooltipContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const Bottom: Story = {
  args: { side: "bottom" },
};

export const InlineEnd: Story = {
  args: { side: "inline-end" },
};
