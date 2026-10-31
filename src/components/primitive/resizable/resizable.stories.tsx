import type { Meta, StoryObj } from "@storybook/react-vite";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Resizable",
  component: ResizablePanelGroup,
  args: { orientation: "horizontal" },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/

// Drag a rule, or focus it and use the arrow keys; Home and End push it to its limits.
export const Playground: Story = {
  render: (args) => (
    <ResizablePanelGroup {...args} className="min-h-64 max-w-2xl rounded-housing border border-border">
      <ResizablePanel defaultSize="30%" minSize={120}>
        <p className="p-4 text-sm">کار</p>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="45%" minSize={160}>
        <p className="p-4 text-sm">گفت‌وگو</p>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="25%" minSize={120}>
        <p className="p-4 text-sm">جزئیات</p>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

// The bare rule, with no grip: what a dense layout uses between its sections.
export const WithoutGrip: Story = {
  render: (args) => (
    <ResizablePanelGroup {...args} className="min-h-48 max-w-md rounded-housing border border-border">
      <ResizablePanel>
        <p className="p-4 text-sm">یک</p>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <p className="p-4 text-sm">دو</p>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
