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

// A project's page: its key and name on the kicker line, and its own keys at the end.
export const WithKickerAndKeys: Story = {
  args: {
    title: "بایگانی",
    code: "TGQ",
    kicker: "تفنگ",
    description: "کارهایی که از تخته برداشته شده‌اند.",
    actions: (
      <Button variant="secondary" size="sm">
        تخته
      </Button>
    ),
  },
};
