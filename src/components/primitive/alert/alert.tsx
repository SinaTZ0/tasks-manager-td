import { type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import type { ComponentProps } from "react";
import { Led, type LedProps } from "../led/led";
import {
  alertActionClasses,
  alertDescriptionClasses,
  alertLedClasses,
  alertTitleClasses,
  alertVariants,
} from "./alert.styles";

/*===== Alert =====*/

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

type AlertVariant = NonNullable<AlertProps["variant"]>;

// Each tone lights the signal with the same meaning everywhere: errors and warnings both need attention (yellow);
// orange stays reserved for action. Neutral notes carry no status, so no LED.
const alertSignal = {
  default: undefined,
  info: "selection",
  success: "positive",
  warning: "attention",
  destructive: "attention",
} satisfies Record<AlertVariant, LedProps["signal"] | undefined>;

/**
 * An inline notice. A leading `svg` child becomes its icon column; status tones also light a LED in the top-end
 * corner. Warnings and errors interrupt with `role="alert"`; the other tones are announced politely with
 * `role="status"`. Pass `role` to override.
 */
function Alert({ className, variant, children, ...props }: AlertProps) {
  const role = variant === "warning" || variant === "destructive" ? "alert" : "status";
  const signal = alertSignal[variant ?? "default"];

  return (
    <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props}>
      {children}
      {signal && <Led signal={signal} state="on" className={alertLedClasses} />}
    </div>
  );
}

/*===== Compound Parts =====*/

function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn(alertTitleClasses, className)} {...props} />;
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn(alertDescriptionClasses, className)} {...props} />;
}

function AlertAction({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn(alertActionClasses, className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
