import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../input/input";
import { Label } from "./label";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Label",
  component: Label,
  args: { children: "عنوان کار" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-2">
      <Label {...args} htmlFor="task-title" />
      <Input id="task-title" placeholder="مثال: بازبینی طرح صفحه ورود" />
    </div>
  ),
};

// The label dims when the control before it is disabled (`peer-disabled`).
export const Disabled: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <input id="watch" type="checkbox" className="peer" disabled />
      <Label {...args} htmlFor="watch">
        دنبال کردن این کار
      </Label>
    </div>
  ),
};
