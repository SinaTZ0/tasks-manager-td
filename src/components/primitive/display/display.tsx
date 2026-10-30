import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { displayLabelClasses, displayValueClasses, displayVariants } from "./display.styles";

/*===== Display =====*/

export type DisplayProps = ComponentProps<"div"> & VariantProps<typeof displayVariants>;

/**
 * A display window: dark glass in the housing for live values (timers, counts, meters). Never use it for static copy;
 * the glass means "this changes".
 */
function Display({ className, size, ...props }: DisplayProps) {
  return (
    <div
      data-slot="display"
      data-size={size ?? "default"}
      {...props}
      className={cn(displayVariants({ size }), className)}
    />
  );
}

/*===== Parts =====*/

/** A dim printed label inside the glass, naming the value next to it. */
function DisplayLabel({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="display-label" {...props} className={cn(displayLabelClasses, className)} />;
}

/**
 * The live value. Numbers and codes read left to right in every language, so the value is isolated as LTR. Wrap it in
 * an `aria-live` region (or use `<output>`) only when its changes need announcing; a ticking timer should not.
 */
function DisplayValue({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="display-value" {...props} className={cn(displayValueClasses, className)}>
      <bdi dir="ltr">{children}</bdi>
    </span>
  );
}

export { Display, DisplayLabel, DisplayValue };
