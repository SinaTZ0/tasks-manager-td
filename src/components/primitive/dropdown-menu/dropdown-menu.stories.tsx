import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDownIcon, Settings2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "../button/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Dropdown Menu",
  component: DropdownMenu,
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>
        آموزش
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>مسیر یادگیری و خدمات آموزشی</DropdownMenuLabel>
          <DropdownMenuItem>معاونت آموزشی</DropdownMenuItem>
          <DropdownMenuItem>گروه‌های آموزشی</DropdownMenuItem>
          <DropdownMenuItem>تقویم آموزشی</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>راهنمای نودانشجویان</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

/**
 * Board view options. Checkbox and radio rows show a LED that lights when on; shortcuts are printed in the
 * instrument mono.
 */
function ViewOptionsMenu() {
  const [showDone, setShowDone] = useState(true);
  const [showBlocked, setShowBlocked] = useState(false);
  const [grouping, setGrouping] = useState("status");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="secondary" size="sm" />}>
        <Settings2Icon data-icon="inline-start" />
        نمایش
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>فیلتر</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={showDone} onCheckedChange={setShowDone}>
            کارهای تمام‌شده
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showBlocked} onCheckedChange={setShowBlocked}>
            فقط مسدودها
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>گروه‌بندی</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={grouping} onValueChange={setGrouping}>
            <DropdownMenuRadioItem value="status">وضعیت</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="assignee">مسئول</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          کار تازه
          <DropdownMenuShortcut>N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          بایگانی ستون
          <DropdownMenuShortcut>Ctrl+⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const CheckboxesAndShortcuts: Story = {
  render: () => <ViewOptionsMenu />,
};
