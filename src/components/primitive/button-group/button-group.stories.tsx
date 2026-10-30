import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArchiveIcon, CalendarDaysIcon, HistoryIcon, SettingsIcon } from "lucide-react";

import { Button } from "../button/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./button-group";

/*===== Meta =====*/
const meta = {
  title: "Primitive/ButtonGroup",
  component: ButtonGroup,
  args: { "aria-label": "صفحه‌های پروژه" },
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/

// The project's pages above the board: four keys in one slot.
export const Playground: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="secondary" size="sm">
        <CalendarDaysIcon data-icon="inline-start" />
        تقویم
      </Button>
      <Button variant="secondary" size="sm">
        <HistoryIcon data-icon="inline-start" />
        فعالیت‌ها
      </Button>
      <Button variant="secondary" size="sm">
        <ArchiveIcon data-icon="inline-start" />
        بایگانی
      </Button>
      <Button variant="secondary" size="sm">
        <SettingsIcon data-icon="inline-start" />
        تنظیمات
      </Button>
    </ButtonGroup>
  ),
};

// A printed label seated before the keys, and a wider gap splitting them into two sets.
export const WithTextAndSeparator: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroupText>نمایش</ButtonGroupText>
      <Button variant="secondary">روز</Button>
      <Button variant="secondary">هفته</Button>
      <ButtonGroupSeparator />
      <Button variant="default">امروز</Button>
    </ButtonGroup>
  ),
};
