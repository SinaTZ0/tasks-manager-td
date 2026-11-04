import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarIcon, HistoryIcon, KanbanIcon, SettingsIcon } from "lucide-react";

import { Marking } from "../marking/marking";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";
import { twContainerVariant } from "./sidebar.styles";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Sidebar",
  component: Sidebar,
  // A sidebar is a housing and spans the page, so it opts out of the story's panel.
  parameters: { housing: false, layout: "fullscreen" },
  argTypes: {
    side: { control: "inline-radio", options: ["start", "end"] },
    variant: { control: "inline-radio", options: Object.keys(twContainerVariant) },
    collapsible: { control: "inline-radio", options: ["offcanvas", "icon", "none"] },
  },
  args: { side: "start", variant: "sidebar", collapsible: "offcanvas" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
const PAGES = [
  { label: "تخته", Icon: KanbanIcon, count: 12 },
  { label: "تقویم", Icon: CalendarIcon, count: 3 },
  { label: "تاریخچه", Icon: HistoryIcon, count: 0 },
  { label: "تنظیمات", Icon: SettingsIcon, count: 0 },
];

function Example({ defaultOpen, ...args }: Story["args"] & { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar {...args}>
        <SidebarHeader>
          <h2 className="font-heading text-h3">تفنگ</h2>
          <Marking variant="code">TGQ</Marking>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>صفحه‌ها</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {PAGES.map(({ label, Icon, count }, index) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton isActive={index === 0} tooltip={label}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {count > 0 && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Marking>نسخهٔ نمایشی</Marking>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="items-start">
        <SidebarTrigger variant="secondary" className="m-6" />
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Default: Story = {
  render: (args) => <Example {...args} />,
};

export const Floating: Story = {
  args: { variant: "floating" },
  render: (args) => <Example {...args} />,
};

export const Folded: Story = {
  render: (args) => <Example {...args} defaultOpen={false} />,
};

export const Icons: Story = {
  args: { collapsible: "icon" },
  render: (args) => <Example {...args} defaultOpen={false} />,
};
