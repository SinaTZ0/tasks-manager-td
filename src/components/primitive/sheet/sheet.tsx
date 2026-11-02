import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "#/lib/utils";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { m } from "#/paraglide/messages";

import { Button } from "../button/button";
import {
  sheetCloseClasses,
  sheetContentClasses,
  sheetDescriptionClasses,
  sheetFooterClasses,
  sheetHeaderClasses,
  sheetOverlayClasses,
  sheetTitleClasses,
  sheetTitlePageClasses,
} from "./sheet.styles";

/*===== Sheet =====*/

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn(sheetOverlayClasses, className)} {...props} />
  );
}

/**
 * The sliding panel. `side` is logical: `start` and `end` follow the reading direction (right and left in Persian),
 * so the mobile menu opens from the inline start edge. `size="page"` ignores `side`: the panel floats over nearly the whole
 * page, for content with room for columns (a task's details).
 * Its width can be narrowed with the `--sheet-page-width` custom property in `style` (never wider than the page), and
 * it glides to a new one.
 */
function SheetContent({
  className,
  children,
  side = "end",
  size = "default",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "start" | "end";
  size?: "default" | "page";
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={size === "page" ? undefined : side}
        data-size={size}
        className={cn(sheetContentClasses, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" className={sheetCloseClasses} size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">{m.common_close()}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

/**
 * The sheet's head, ruled off from its body. `tabbed` drops the padding under its last row, so folder tabs there
 * stand on the rule and an open one joins the body below.
 */
function SheetHeader({ className, tabbed = false, ...props }: ComponentProps<"div"> & { tabbed?: boolean }) {
  return (
    <div
      data-slot="sheet-header"
      data-tabbed={tabbed ? "" : undefined}
      className={cn(sheetHeaderClasses, className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn(sheetFooterClasses, className)} {...props} />;
}

/** The sheet's name. `size="page"` sets it large, as the heading of a page sheet. */
function SheetTitle({
  className,
  size = "default",
  ...props
}: SheetPrimitive.Title.Props & { size?: "default" | "page" }) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      data-clickable={props.onClick ? "" : undefined}
      className={cn(sheetTitleClasses, size === "page" && sheetTitlePageClasses, className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(sheetDescriptionClasses, className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
