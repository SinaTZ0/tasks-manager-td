import type { Meta, StoryObj } from "@storybook/react-vite";

import type { RichTextDoc } from "#/lib/rich-text";

import { RichText } from "./rich-text";

/*===== Data =====*/
const comment: RichTextDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "نسخه جدید " },
        { type: "text", text: "آماده", marks: [{ type: "bold" }] },
        { type: "text", text: " است. لطفاً " },
        { type: "text", text: "این صفحه", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
        { type: "text", text: " را نگاه کنید." },
      ],
    },
    {
      type: "orderedList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ورود" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ثبت زمان" }] }] },
      ],
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "تا پنجشنبه تمامش کنیم.", marks: [] }] }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The " },
        { type: "text", text: "task.move", marks: [{ type: "code" }] },
        { type: "text", text: " procedure still needs a test." },
      ],
    },
  ],
};

/*===== Meta =====*/
const meta = {
  title: "Primitive/RichText",
  component: RichText,
  args: { doc: comment },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// An English paragraph inside Persian text keeps its own direction.
export const MixedDirections: Story = {
  args: {
    doc: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "این متن فارسی است." }] },
        { type: "paragraph", content: [{ type: "text", text: "This paragraph is English and reads left to right." }] },
        { type: "paragraph", content: [{ type: "text", text: "و دوباره فارسی." }] },
      ],
    },
  },
};
