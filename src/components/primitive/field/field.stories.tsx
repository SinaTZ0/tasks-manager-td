import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../input/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select/select";
import { Textarea } from "../textarea/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "./field";
import { twOrientation } from "./field.styles";

const orientationOptions = Object.keys(twOrientation) as Array<keyof typeof twOrientation>;

/*===== Data =====*/
const people = [
  { value: "sara", label: "سارا احمدی" },
  { value: "reza", label: "رضا کریمی" },
  { value: "mina", label: "مینا رستمی" },
];

/*===== Meta =====*/
const meta = {
  title: "Primitive/Field",
  component: Field,
  argTypes: {
    orientation: {
      control: "select",
      options: orientationOptions,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <FieldGroup>
      <Field {...args}>
        <FieldLabel htmlFor="task-title">عنوان کار</FieldLabel>
        <Input id="task-title" placeholder="مثال: بازبینی طرح صفحه ورود" />
        <FieldDescription>یک جمله کوتاه که در کارت تخته دیده می‌شود.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// The label prints in the danger ink, the cut turns yellow, and the error says why in words.
export const Invalid: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="estimate">برآورد زمان (دقیقه)</FieldLabel>
      <Input id="estimate" dir="ltr" inputMode="numeric" defaultValue="0" aria-invalid />
      <FieldError>برآورد باید دست‌کم ۱۵ دقیقه باشد.</FieldError>
    </Field>
  ),
};

// Several messages are de-duplicated and shown as a list.
export const ErrorList: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
      <Input id="password" type="password" aria-invalid />
      <FieldError
        errors={[
          { message: "رمز عبور حداقل ۸ نویسه باشد." },
          { message: "یک عدد هم داشته باشد." },
          { message: "رمز عبور حداقل ۸ نویسه باشد." },
        ]}
      />
    </Field>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Field {...args} data-disabled>
      <FieldLabel htmlFor="owner">مالک کار</FieldLabel>
      <Input id="owner" disabled defaultValue="سارا احمدی" />
    </Field>
  ),
};

export const Horizontal: Story = {
  args: { orientation: "horizontal" },
  render: (args) => (
    <Field {...args}>
      <input id="reminders" type="checkbox" />
      <FieldContent>
        <FieldLabel htmlFor="reminders">یادآوری سررسید</FieldLabel>
        <FieldDescription>یک روز قبل از سررسید هر کار اعلان می‌گیرید.</FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const FormSection: Story = {
  render: (args) => (
    <FieldSet>
      <FieldLegend>جزئیات کار</FieldLegend>
      <FieldDescription>همه اعضای تیم این بخش را می‌بینند.</FieldDescription>
      <FieldGroup>
        <Field {...args}>
          <FieldLabel htmlFor="form-title">عنوان کار</FieldLabel>
          <Input id="form-title" placeholder="مثال: بازبینی طرح صفحه ورود" />
        </Field>
        <Field {...args}>
          <FieldLabel htmlFor="form-assignee">انجام‌دهنده</FieldLabel>
          <Select items={people} defaultValue="sara">
            <SelectTrigger id="form-assignee" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.value} value={person.value}>
                  {person.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <FieldSeparator>اختیاری</FieldSeparator>
        <Field {...args}>
          <FieldLabel htmlFor="form-notes">توضیحات</FieldLabel>
          <Textarea id="form-notes" placeholder="پیش‌زمینه، پیوندها، معیار انجام…" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
