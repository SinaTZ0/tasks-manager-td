import type { Meta, StoryObj } from "@storybook/react-vite";
import { MenuIcon } from "lucide-react";

import { Button } from "../button/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Sheet",
  component: SheetContent,
  // The sheet floats above the page, so the trigger sits straight on the desk
  parameters: { housing: false },
  argTypes: {
    side: { control: "select", options: ["start", "end", "top", "bottom"] },
  },
  render: (args) => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon" aria-label="منو" />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent {...args}>
        <SheetHeader>
          <SheetTitle>منو</SheetTitle>
          <SheetDescription>دسترسی به بخش‌های سایت</SheetDescription>
        </SheetHeader>
        <div className="px-6 text-body-sm">تخته، کارهای من، گزارش زمان</div>
        <SheetFooter>
          <Button variant="secondary">بستن منو</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<typeof SheetContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = { args: { side: "start" } };
export const Bottom: Story = { args: { side: "bottom" } };
