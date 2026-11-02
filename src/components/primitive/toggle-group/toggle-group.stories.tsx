import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { markingClasses, readoutClasses } from "../instrument.styles";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

/*===== Meta =====*/
const meta = {
  title: "Primitive/ToggleGroup",
  component: ToggleGroup,
  args: { "aria-label": "اولویت" },
  argTypes: {
    size: { control: "select", options: ["sm", "default", "lg"] },
    variant: { control: "select", options: ["default", "outline", "tab"] },
    signal: { control: "select", options: ["action", "attention", "selection", "positive"] },
    spacing: { control: { type: "number", min: 0, max: 6 } },
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const priorities = [
  { value: "low", label: "کم" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" },
  { value: "urgent", label: "فوری" },
] as const;

/*===== Stories =====*/

// One choice in a shared slot, like a mode strip. Arrow keys move along it in the reading direction.
export const Playground: Story = {
  args: { defaultValue: ["medium"] },
  render: (args) => (
    <ToggleGroup {...args}>
      {priorities.map((priority) => (
        <ToggleGroupItem key={priority.value} value={priority.value}>
          {priority.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  ),
};

// A mode selector must always hold one value: pressing the latched key again reports an empty array, so ignore it.
export const AlwaysOne: Story = {
  render: function AlwaysOneStory() {
    const [value, setValue] = useState<string>("high");

    return (
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="اولویت"
          value={[value]}
          onValueChange={(next) => {
            if (next[0]) setValue(next[0]);
          }}
        >
          {priorities.map((priority) => (
            <ToggleGroupItem key={priority.value} value={priority.value}>
              {priority.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className={markingClasses}>
          مقدار: <bdi dir="ltr">{value}</bdi>
        </span>
      </div>
    );
  },
};

// Several at once with `multiple`; the LED marks every latched key.
export const Multiple: Story = {
  render: () => (
    <ToggleGroup aria-label="برچسب‌ها" multiple defaultValue={["bug", "ui"]} size="sm">
      <ToggleGroupItem value="bug">باگ</ToggleGroupItem>
      <ToggleGroupItem value="ui">رابط</ToggleGroupItem>
      <ToggleGroupItem value="api">API</ToggleGroupItem>
      <ToggleGroupItem value="docs">مستند</ToggleGroupItem>
    </ToggleGroup>
  ),
};

// A positive `spacing` gives every key its own cut instead of one shared slot.
export const SeparateKeys: Story = {
  render: () => (
    <ToggleGroup aria-label="وضعیت" spacing={3} defaultValue={["doing"]} signal="positive">
      <ToggleGroupItem value="todo">انجام نشده</ToggleGroupItem>
      <ToggleGroupItem value="doing">در حال انجام</ToggleGroupItem>
      <ToggleGroupItem value="done">انجام شده</ToggleGroupItem>
    </ToggleGroup>
  ),
};

// Folder tabs standing on a ruled edge, for switches that open the panels under them (the task drawer's columns). An
// open tab joins the panel; each can print a short summary of what it holds.
export const Tabs: Story = {
  render: () => (
    <div className="flex w-120 flex-col">
      <ToggleGroup
        aria-label="ستون‌ها"
        multiple
        variant="tab"
        size="md"
        spacing={1}
        defaultValue={["work", "tracking"]}
        className="w-full border-b border-border"
      >
        <ToggleGroupItem value="work">
          کار <span className={readoutClasses}>۲/۵</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="tracking">
          پیگیری <span className={readoutClasses}>۰:۲۴:۰۳</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="details">مشخصات</ToggleGroupItem>
      </ToggleGroup>
      <div className="h-24 border-x border-b border-border bg-leaf" />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ToggleGroup aria-label="نما" orientation="vertical" defaultValue={["board"]}>
      <ToggleGroupItem value="board">تخته</ToggleGroupItem>
      <ToggleGroupItem value="list">فهرست</ToggleGroupItem>
      <ToggleGroupItem value="calendar">تقویم</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <ToggleGroup aria-label="اولویت" defaultValue={["low"]} disabled>
      {priorities.map((priority) => (
        <ToggleGroupItem key={priority.value} value={priority.value}>
          {priority.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  ),
};
