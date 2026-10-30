import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";

import { Led } from "../led/led";
import type { LedProps } from "../led/led";
import { toggleVariants } from "./toggle.styles";

/*===== Toggle =====*/

export type ToggleProps = TogglePrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    /** Colour of the LED that lights while the key is latched. One meaning per colour (docs/frontend/app-identity.md). */
    signal?: LedProps["signal"];
    /** Shows the LED. Turn it off only where the sunk face is cue enough, such as a dense formatting toolbar. */
    indicator?: boolean;
  };

/**
 * A latching key: stays sunk while on and lights an LED, like a sampler's mode keys. The LED is the
 * colour-independent cue beside the sunk face; `aria-pressed` comes from Base UI. Icon-only toggles need an
 * `aria-label`.
 */
function Toggle({
  className,
  variant = "default",
  size = "default",
  signal = "action",
  indicator = true,
  ...props
}: ToggleProps) {
  const classes = toggleVariants({ variant, size });

  return (
    <TogglePrimitive
      data-slot="toggle"
      {...props}
      className={typeof className === "function" ? (state) => cn(classes, className(state)) : cn(classes, className)}
      render={(renderProps, state) => (
        <button type="button" {...renderProps}>
          {indicator && <Led signal={signal} state={state.pressed ? "on" : "off"} size="sm" />}
          {renderProps.children}
        </button>
      )}
    />
  );
}

export { Toggle };
