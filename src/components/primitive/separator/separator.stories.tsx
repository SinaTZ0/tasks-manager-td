import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Separator",
  component: Separator,
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "dashed"] },
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

export const Dashed: Story = {
  args: { variant: "dashed" },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-6 text-sm">
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-h4">چک‌لیست</h3>
        <p>۲ از ۵ مورد انجام شده</p>
      </section>
      <Separator {...args} />
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-h4">پیوست‌ها</h3>
        <p>طرح صفحه ورود در فیگما</p>
      </section>
    </div>
  ),
};
