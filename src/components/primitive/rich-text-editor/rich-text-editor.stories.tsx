import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import type { RichTextDoc } from "#/lib/rich-text";

import { Field, FieldDescription, FieldError, FieldLabel } from "../field/field";
import { RichText } from "../rich-text/rich-text";
import { RichTextEditor, type RichTextEditorProps } from "./rich-text-editor";

/*===== Data =====*/
// A description as a teammate writes it: Persian with an English line, a list, a link and inline code.
const description: RichTextDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "صفحه ورود در موبایل " },
        { type: "text", text: "کمی پایین", marks: [{ type: "bold" }] },
        { type: "text", text: " افتاده. طرح جدید در " },
        { type: "text", text: "فیگما", marks: [{ type: "link", attrs: { href: "https://figma.com" } }] },
        { type: "text", text: " است." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "دکمه ورود" }] }] },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "پیام خطای " },
                { type: "text", text: "INVALID_INPUT", marks: [{ type: "code" }] },
              ],
            },
          ],
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "Check it on Safari before merging." }] },
  ],
};

/*===== Controlled =====*/
/** The editor with its document in state, as a form holds it, and the saved look beside it. */
function Controlled({ preview = false, ...args }: RichTextEditorProps & { preview?: boolean }) {
  const [doc, setDoc] = useState(args.value);
  return (
    <div className="flex flex-col gap-6">
      <RichTextEditor
        {...args}
        value={doc}
        onChange={(next) => {
          setDoc(next);
          args.onChange(next);
        }}
      />
      {preview && doc && <RichText doc={doc} />}
    </div>
  );
}

/*===== Meta =====*/
const meta = {
  title: "Primitive/RichTextEditor",
  component: RichTextEditor,
  args: {
    value: null,
    onChange: fn(),
    onSubmit: fn(),
    placeholder: "توضیح کار را بنویسید…",
    "aria-label": "توضیح",
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

export const Filled: Story = {
  args: { value: description },
};

// The read-only RichText under the editor shows the saved document looks the same as the one being written.
export const WithPreview: Story = {
  args: { value: description },
  render: (args) => <Controlled {...args} preview />,
};

// A FieldLabel's `htmlFor` names the surface and puts the caret in it on click.
export const WithLabel: Story = {
  args: { "aria-label": undefined, id: "task-description" },
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="task-description">توضیح</FieldLabel>
      <Controlled {...args} />
      <FieldDescription>Ctrl+Enter فرم را می‌فرستد.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  args: { "aria-invalid": true, "aria-label": undefined, id: "comment", "aria-describedby": "comment-error" },
  render: (args) => (
    <Field data-invalid>
      <FieldLabel htmlFor="comment">نظر</FieldLabel>
      <Controlled {...args} />
      <FieldError id="comment-error">نظر خالی است. چیزی بنویسید.</FieldError>
    </Field>
  ),
};

export const Disabled: Story = {
  args: { value: description, disabled: true },
};
