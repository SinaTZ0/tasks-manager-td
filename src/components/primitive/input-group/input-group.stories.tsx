import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClockIcon, SearchIcon, SendIcon, XIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";

/*===== Meta =====*/
const meta = {
  title: "Primitive/InputGroup",
  component: InputGroup,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
// Addons are printed on the plate; the one cut wraps the control and its addons.
export const WithIcon: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="جست‌وجو در کارها" aria-label="جست‌وجو در کارها" />
    </InputGroup>
  ),
};

// The default addon button is printed on the plate (ghost).
// The field in the header, on the display glass.
export const OnGlass: Story = {
  render: () => (
    <div className="bg-glass p-3">
      <InputGroup variant="glass" className="w-60">
        <InputGroupAddon>
          <SearchIcon className="size-4" />
        </InputGroupAddon>
        <InputGroupInput type="search" placeholder="جست‌وجوی کارها…" aria-label="جست‌وجوی کارها" />
      </InputGroup>
    </div>
  ),
};

export const WithButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput defaultValue="طرح صفحه ورود" aria-label="جست‌وجو در کارها" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="پاک کردن">
          <XIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

// A unit printed in the instrument mono at the end of the plate.
export const WithText: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <ClockIcon />
      </InputGroupAddon>
      <InputGroupInput dir="ltr" inputMode="numeric" defaultValue="90" aria-label="برآورد زمان" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>دقیقه</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

// A comment box: the send key is a small graphite keycap seated in the plate.
export const WithTextarea: Story = {
  render: () => (
    <InputGroup>
      <InputGroupTextarea placeholder="نظر خود را بنویسید…" aria-label="نظر" />
      <InputGroupAddon align="block-end" className="justify-between">
        <InputGroupText>
          <bdi dir="ltr">0 / 300</bdi>
        </InputGroupText>
        <InputGroupButton variant="default" size="xs">
          <SendIcon data-icon="inline-start" />
          ارسال
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput aria-invalid defaultValue="؟" aria-label="جست‌وجو در کارها" />
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput disabled defaultValue="طرح صفحه ورود" aria-label="جست‌وجو در کارها" />
    </InputGroup>
  ),
};
