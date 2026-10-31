import type { Meta, StoryObj } from "@storybook/react-vite";

import { markingClasses } from "../instrument.styles";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "./avatar";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Avatar",
  component: Avatar,
  args: { size: "default", tone: "light" },
  argTypes: {
    size: { control: "select", options: ["sm", "default", "lg"] },
    tone: { control: "select", options: ["light", "graphite"] },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>
        <span aria-hidden="true">س</span>
        <span className="sr-only">سینا</span>
      </AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {(["sm", "default", "lg"] as const).map((size) => (
        <Avatar key={size} size={size}>
          <AvatarFallback>
            <span aria-hidden="true">م</span>
            <span className="sr-only">مریم</span>
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};

// Owner (graphite) beside assignee (light) on a delegated task. The role is said in words as well.
export const OwnerAndAssignee: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <span className="flex items-center gap-2">
        <Avatar tone="graphite">
          <AvatarFallback>
            <span aria-hidden="true">س</span>
            <span className="sr-only">سینا</span>
          </AvatarFallback>
        </Avatar>
        <span className={markingClasses}>مالک</span>
      </span>
      <span className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>
            <span aria-hidden="true">ر</span>
            <span className="sr-only">رضا</span>
          </AvatarFallback>
        </Avatar>
        <span className={markingClasses}>انجام‌دهنده</span>
      </span>
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>
        <span aria-hidden="true">ن</span>
        <span className="sr-only">نیلوفر، در حال کار</span>
      </AvatarFallback>
      <AvatarBadge />
    </Avatar>
  ),
};

/** A card's people, top to bottom, whose clock runs lit in the corner. */
export const VerticalGroup: Story = {
  render: () => (
    <AvatarGroup orientation="vertical">
      {["س", "م"].map((initial) => (
        <Avatar key={initial} size="sm">
          <AvatarFallback>{initial}</AvatarFallback>
          {initial === "س" && <AvatarBadge />}
        </Avatar>
      ))}
      <AvatarGroupCount>
        <bdi dir="ltr">+2</bdi>
      </AvatarGroupCount>
    </AvatarGroup>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {["س", "م", "ر"].map((initial) => (
        <Avatar key={initial}>
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>
        <bdi dir="ltr">+2</bdi>
      </AvatarGroupCount>
    </AvatarGroup>
  ),
};
