import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Separator",
  component: Separator,
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "perforated"] },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Horizontal: Story = {
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-3 text-sm">
      <p>آخرین مطالب</p>
      <Separator {...args} />
      <p>به‌روزرسانی: ۱۶ مهر ۱۴۰۵</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <div className="flex h-6 items-center gap-3 text-sm">
      <span>آموزش</span>
      <Separator {...args} orientation="vertical" />
      <span>پژوهش</span>
      <Separator {...args} orientation="vertical" />
      <span>دانشجویی</span>
    </div>
  ),
};

// The notches show as bites out of the sheet's sides: the rule runs edge to edge (`-mx-6`) in a parent that clips.
export const Perforated: Story = {
  args: { variant: "perforated" },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-6 overflow-hidden rounded-chassis border border-border bg-leaf p-6 text-sm">
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-h4">چک‌لیست</h3>
        <p>۲ از ۵ مورد انجام شده</p>
      </section>
      <Separator {...args} className="-mx-6" />
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-h4">پیوست‌ها</h3>
        <p>طرح صفحه ورود در فیگما</p>
      </section>
    </div>
  ),
};
