import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "./switch";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Switch",
  component: Switch,
  args: { "aria-label": "توقف خودکار" },
  argTypes: {
    size: { control: "select", options: ["sm", "default"] },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <Switch aria-label="خاموش" />
      <Switch aria-label="روشن" defaultChecked />
      <Switch aria-label="کوچک" size="sm" />
      <Switch aria-label="کوچک روشن" size="sm" defaultChecked />
      <Switch aria-label="غیرفعال" disabled />
      <Switch aria-label="روشن و غیرفعال" disabled defaultChecked />
      <Switch aria-label="نامعتبر" aria-invalid />
    </div>
  ),
};

// A settings row: the label wraps the switch, so the whole row is the tap target.
export const SettingRow: Story = {
  render: () => (
    <label htmlFor="auto-pause" className="flex w-96 cursor-pointer items-center justify-between gap-6">
      <span className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold">توقف خودکار</span>
        <span className="text-caption text-muted-foreground">با خروج کار از ستون «در حال انجام»، زمان متوقف شود.</span>
      </span>
      <Switch id="auto-pause" defaultChecked />
    </label>
  ),
};
