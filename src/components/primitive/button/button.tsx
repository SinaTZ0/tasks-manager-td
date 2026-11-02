import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import { type ComponentProps, type CSSProperties, type ReactNode, useState } from "react";
import { buttonVariants } from "./button.styles";

/*===== Button =====*/

export type ButtonProps = ComponentProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants> & {
    /** The key's width glides when its legend changes (a latching key reading "Start working", then "Working"). */
    glide?: boolean;
  };

/**
 * Styles Base UI's button while preserving its refs, rendering, and interaction behavior.
 * Use `variant`/`size` for the button's look and `className` for consumer layout; a function
 * `className` still receives Base UI state. Icon-only sizes need an accessible name via `aria-label`.
 */
function Button({ className, variant, size, glide = false, children, ...props }: ButtonProps) {
  const classes = buttonVariants({ variant, size });

  return (
    <ButtonPrimitive
      data-slot="button"
      {...props}
      className={typeof className === "function" ? (state) => cn(classes, className(state)) : cn(classes, className)}
    >
      {glide ? <GlidingLegend>{children}</GlidingLegend> : children}
    </ButtonPrimitive>
  );
}

/*===== Gliding Legend =====*/

/** The legend of a `glide` button: measured as it changes, so its box can animate to the new width (`width-glide`). */
function GlidingLegend({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState<number>();
  const measure = (element: HTMLSpanElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  };

  return (
    <span
      className="width-glide"
      style={width === undefined ? undefined : ({ "--glide-width": `${width}px` } as CSSProperties)}
    >
      <span ref={measure}>{children}</span>
    </span>
  );
}

export { Button };
