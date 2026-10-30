import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { Input } from "../input/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

/*===== Meta =====*/
const meta = {
  title: "Primitive/Dialog",
  component: Dialog,
  // A dialog floats above the page, not on a housing
  parameters: { housing: false },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" />}>واگذاری کار</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>واگذاری TD-42</DialogTitle>
          <DialogDescription>مالک کار تغییر نمی‌کند؛ فقط انجام‌دهنده عوض می‌شود.</DialogDescription>
        </DialogHeader>
        <Input aria-label="یادداشت واگذاری" placeholder="یادداشت برای انجام‌دهنده" />
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>انصراف</DialogClose>
          <Button>واگذار کن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Starts open, so the screenshot and the a11y panel see the dialog itself.
export const Open: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button variant="secondary" />}>حذف کار</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>این کار حذف شود؟</DialogTitle>
          <DialogDescription>
            تاریخچه، نظرها و زمان‌های ثبت‌شده هم حذف می‌شوند. این کار برگشت‌پذیر نیست.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive">حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
