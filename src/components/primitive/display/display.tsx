import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { displayButtonClasses, displayLabelClasses, displayValueClasses, displayVariants } from "./display.styles";

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

/**
 * A zone of the glass that answers a press, for a live value that is also a switch (a board column shown or hidden).
 * Give it `aria-pressed` when it latches; let go, it dims. Its content is the value it shows, so it needs an
 * `aria-label` only when that content doesn't name it.
 */
function DisplayButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return <button data-slot="display-button" type={type} {...props} className={cn(displayButtonClasses, className)} />;
}

export { Display, DisplayButton, DisplayLabel, DisplayValue };
