import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group/toggle-group";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Popover",
  component: Popover,
  // A popover floats above the page, not on a housing
  parameters: { housing: false },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {
  render: () => (
    <div className="flex min-h-64 items-start justify-center p-6">
      <Popover>
        <PopoverTrigger render={<Button variant="secondary" />}>اولویت</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>اولویت کار</PopoverTitle>
            <PopoverDescription>کارهای فوری بالای ستون می‌مانند.</PopoverDescription>
          </PopoverHeader>
          <ToggleGroup aria-label="اولویت" defaultValue={["medium"]} size="sm">
            <ToggleGroupItem value="low">کم</ToggleGroupItem>
            <ToggleGroupItem value="medium">متوسط</ToggleGroupItem>
            <ToggleGroupItem value="high">زیاد</ToggleGroupItem>
          </ToggleGroup>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

// Starts open so the screenshot shows the module.
export const Open: Story = {
  render: () => (
    <div className="flex min-h-64 items-start justify-center p-6">
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="secondary" />}>جزئیات</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>منتظر TD-41</PopoverTitle>
            <PopoverDescription>این کار تا انجام شدن کار وابسته شروع نمی‌شود.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
