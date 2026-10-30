import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

import {
  popoverContentClasses,
  popoverDescriptionClasses,
  popoverHeaderClasses,
  popoverPositionerClasses,
  popoverTitleClasses,
} from "./popover.styles";

/*===== Popover =====*/

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * The floating module. `side` and `align` take Base UI's values, including the logical `inline-start` and
 * `inline-end`, which follow the reading direction. `anchor` places it by something other than its trigger, such as
 * the caret in an editor.
 */
function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  // Clears the trigger's cut (3px) with room to spare, so the module never touches the part that opened it
  sideOffset = 8,
  anchor,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "anchor">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        className={popoverPositionerClasses}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          {...props}
          className={
            typeof className === "function"
              ? (state) => cn(popoverContentClasses, className(state))
              : cn(popoverContentClasses, className)
          }
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn(popoverHeaderClasses, className)} {...props} />;
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(popoverTitleClasses, className(state))
          : cn(popoverTitleClasses, className)
      }
    />
  );
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(popoverDescriptionClasses, className(state))
          : cn(popoverDescriptionClasses, className)
      }
    />
  );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
