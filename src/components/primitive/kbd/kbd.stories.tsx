import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeftIcon, CommandIcon } from "lucide-react";

import { Kbd, KbdGroup } from "./kbd";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Kbd",
  component: Kbd,
  args: { children: "N" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const Chord: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>
        <CommandIcon />
      </Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

// Shortcuts printed beside the action they trigger
export const InText: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-body-sm">
      <span className="flex items-center gap-2">
        کار تازه
        <Kbd>N</Kbd>
      </span>
      <span className="flex items-center gap-2">
        جست‌وجو
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </span>
      <span className="flex items-center gap-2">
        کار بعدی
        <Kbd>
          <ArrowLeftIcon />
        </Kbd>
      </span>
    </div>
  ),
};
