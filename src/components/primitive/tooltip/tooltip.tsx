import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "#/lib/utils";
import { tooltipContentClasses, tooltipPositionerClasses } from "./tooltip.styles";

/*===== Tooltip =====*/

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/*===== Popup =====*/

export type TooltipContentProps = TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">;

/** Renders the portal, positioner and popup together. The popup is a strip of display glass with no arrow. */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={tooltipPositionerClasses}
      >
        <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn(tooltipContentClasses, className)} {...props}>
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/*===== On A Touch Screen =====*/

/** Long enough to read a name or a short line. */
const TAP_TOOLTIP_MS = 2500;

/**
 * Base UI opens a tooltip for a mouse only, so what one alone says would never reach a finger. Spread `root` on the
 * `Tooltip` and call `tapped()` from a tap: on a touch screen it shows the tooltip for a moment, elsewhere it does nothing.
 */
function useTapTooltip() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    // While a tap's timer runs Base UI has no say: it closes the tooltip right after the tap, the finger being no mouse.
    root: { open, onOpenChange: (next: boolean) => timer.current === undefined && setOpen(next) },
    tapped: () => {
      if (!window.matchMedia("(hover: none)").matches) return;
      setOpen(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        setOpen(false);
      }, TAP_TOOLTIP_MS);
    },
  };
}

/** A tooltip for a part that isn't a key, such as a person's cap: pointing at it shows the text, and so does a tap. */
function TapTooltip({ trigger, children }: { trigger: ReactElement; children: ReactNode }) {
  const { root, tapped } = useTapTooltip();

  return (
    <Tooltip {...root}>
      <TooltipTrigger render={trigger} closeOnClick={false} onClick={tapped} />
      <TooltipContent aria-hidden="true">{children}</TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TapTooltip, useTapTooltip };
