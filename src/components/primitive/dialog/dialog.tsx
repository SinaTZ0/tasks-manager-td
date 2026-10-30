import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

import { m } from "#/paraglide/messages";

import { Button } from "../button/button";
import {
  dialogCloseClasses,
  dialogContentClasses,
  dialogDescriptionClasses,
  dialogFooterClasses,
  dialogHeaderClasses,
  dialogOverlayClasses,
  dialogTitleClasses,
} from "./dialog.styles";

/*===== Dialog =====*/

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(dialogOverlayClasses, className(state))
          : cn(dialogOverlayClasses, className)
      }
    />
  );
}

/** The dialog module. The close key in its corner is labelled with `common_close`; hide it with `showCloseButton`. */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        {...props}
        className={
          typeof className === "function"
            ? (state) => cn(dialogContentClasses, className(state))
            : cn(dialogContentClasses, className)
        }
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="secondary" size="icon-sm" className={dialogCloseClasses} />}
          >
            <XIcon />
            <span className="sr-only">{m.common_close()}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn(dialogHeaderClasses, className)} {...props} />;
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div data-slot="dialog-footer" className={cn(dialogFooterClasses, className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="secondary" />}>{m.common_close()}</DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(dialogTitleClasses, className(state))
          : cn(dialogTitleClasses, className)
      }
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(dialogDescriptionClasses, className(state))
          : cn(dialogDescriptionClasses, className)
      }
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
