import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Checkbox",
  component: Checkbox,
  args: { "aria-label": "انجام شد" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Checkbox aria-label="خالی" />
      <Checkbox aria-label="تیک‌خورده" defaultChecked />
      <Checkbox aria-label="غیرفعال" disabled />
      <Checkbox aria-label="تیک‌خورده و غیرفعال" defaultChecked disabled />
      <Checkbox aria-label="نامعتبر" aria-invalid />
    </div>
  ),
};

// A checklist: the label wraps the key, so the whole row toggles it. Done items fade and strike through.
export const Checklist: Story = {
  render: () => (
    <ul className="flex w-80 flex-col gap-3">
      {[
        { label: "طراحی صفحه ورود", done: true },
        { label: "اتصال به API", done: false },
        { label: "نوشتن تست‌ها", done: false },
      ].map((item) => (
        <li key={item.label}>
          <label className="group/check flex min-h-10 cursor-pointer items-center gap-3">
            <Checkbox defaultChecked={item.done} />
            <span className="text-body-sm group-has-data-checked/check:text-muted-foreground group-has-data-checked/check:line-through">
              {item.label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  ),
};
