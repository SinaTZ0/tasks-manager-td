import { mergeProps } from "@base-ui/react/merge-props";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { type VariantProps } from "class-variance-authority";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "#/lib/utils";

import { Led } from "../led/led";
import type { LedProps } from "../led/led";
import { toggleVariants } from "./toggle.styles";

/*===== LED Rendering =====*/

type ToggleRender = TogglePrimitive.Props["render"];

/**
 * A toggle's `render`, putting the LED (which needs the pressed state) before the key's content. A caller's own
 * `render` (an element such as `<a>`, or a function) is kept and receives the content with the LED, instead of being
 * replaced. Also used by ToggleGroupItem.
 */
function renderWithLed({
  render,
  led,
}: {
  render: ToggleRender;
  led: (pressed: boolean) => ReactNode;
}): NonNullable<ToggleRender> {
  return (renderProps, state) => {
    const props = {
      ...renderProps,
      children: (
        <>
          {led(state.pressed)}
          {renderProps.children}
        </>
      ),
    };
    if (typeof render === "function") return render(props, state);
    // The element's own props win, as in Base UI's `render`; handlers are chained and class names joined
    if (isValidElement<Record<string, unknown>>(render)) return cloneElement(render, mergeProps(props, render.props));
    return <button type="button" {...props} />;
  };
}

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
  render,
  ...props
}: ToggleProps) {
  const classes = toggleVariants({ variant, size });

  return (
    <TogglePrimitive
      data-slot="toggle"
      {...props}
      className={typeof className === "function" ? (state) => cn(classes, className(state)) : cn(classes, className)}
      render={renderWithLed({
        render,
        led: (pressed) => indicator && <Led signal={signal} state={pressed ? "on" : "off"} size="sm" />,
      })}
    />
  );
}

export { Toggle, renderWithLed };
