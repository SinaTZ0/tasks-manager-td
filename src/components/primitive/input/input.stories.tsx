import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";
import { Label } from "../label/label";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Input",
  component: Input,
  args: { placeholder: "عنوان کار", "aria-label": "عنوان کار" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// Tab into the field: the cut lights orange while it has focus.
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="task-title">عنوان کار</Label>
      <Input {...args} id="task-title" aria-label={undefined} />
    </div>
  ),
};

export const Filled: Story = {
  args: { defaultValue: "بازبینی طرح صفحه ورود" },
};

// Codes, numbers and addresses stay LTR inside the RTL layout.
export const Code: Story = {
  args: {
    dir: "ltr",
    placeholder: "TD-42",
    "aria-label": "شناسه کار",
  },
};

// The cut turns yellow while the field is invalid and unfocused; FieldError says why in words.
export const Invalid: Story = {
  args: { defaultValue: "", "aria-invalid": true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "بازبینی طرح صفحه ورود" },
};

// Every state side by side, as they sit on a form.
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <Input aria-label="خالی" placeholder="عنوان کار" />
      <Input aria-label="پر" defaultValue="بازبینی طرح صفحه ورود" />
      <Input aria-label="نامعتبر" aria-invalid defaultValue="" placeholder="عنوان نمی‌تواند خالی باشد" />
      <Input aria-label="غیرفعال" disabled defaultValue="بازبینی طرح صفحه ورود" />
    </div>
  ),
};
