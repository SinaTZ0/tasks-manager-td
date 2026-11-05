import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "#/components/primitive/button/button";
import { PageHead } from "#/components/shared/page-head/page-head";

/*===== Meta =====*/
const meta = {
  title: "Shared/PageHead",
  component: PageHead,
  parameters: { housing: false },
  args: { title: "کارهای من", description: "کارهای باز سپرده‌شده به شما در همه پروژه‌هایتان." },
} satisfies Meta<typeof PageHead>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Default: Story = {};

// A page with its own keys at the end.
export const WithKeys: Story = {
  args: {
    title: "بایگانی",
    description: "کارهایی که از تخته برداشته شده‌اند.",
    actions: (
      <Button variant="secondary" size="sm">
        تخته
      </Button>
    ),
  },
};
