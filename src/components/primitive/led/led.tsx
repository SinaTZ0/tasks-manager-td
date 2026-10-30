import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { ledVariants } from "./led.styles";

/*===== Led =====*/

export type LedProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof ledVariants> & {
    /** When given, the LED is announced as an image with this name; otherwise it is decorative. */
    label?: string | undefined;
  };

/**
 * A square indicator LED in one of the four signal colours. An LED never carries meaning alone: pair it with a
 * printed word nearby, or give it a `label` when it stands by itself.
 */
function Led({ className, signal, state, size, label, ...props }: LedProps) {
  return (
    <span
      data-slot="led"
      data-state={state ?? "on"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
      className={cn(ledVariants({ signal, state, size }), className)}
    />
  );
}

export { Led };
