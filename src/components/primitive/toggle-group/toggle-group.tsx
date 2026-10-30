import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";
import { createContext, useContext, type CSSProperties } from "react";
import { cn } from "#/lib/utils";

import { Led, type LedProps } from "../led/led";
import { toggleVariants } from "../toggle/toggle.styles";
import { toggleGroupClasses, toggleGroupItemClasses } from "./toggle-group.styles";

/*===== Context =====*/

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  spacing?: number;
  orientation?: "horizontal" | "vertical";
  signal?: LedProps["signal"];
};

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  spacing: 0,
  orientation: "horizontal",
  signal: "selection",
});

/*===== Toggle Group =====*/

export type ToggleGroupProps = ToggleGroupPrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    /** 0 seats the keys in one shared slot; a positive value (Tailwind spacing steps) gives each key its own cut. */
    spacing?: number;
    orientation?: "horizontal" | "vertical";
    /** LED colour for latched items. Blue by default, because a group picks a selection. */
    signal?: LedProps["signal"];
  };

/**
 * A set of latch keys: one choice (the default) or several with `multiple`. Arrow keys move between items and follow
 * the reading direction through Base UI's DirectionProvider. A mode selector that must always hold one value should
 * ignore the empty array Base UI reports when the latched key is pressed again.
 */
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  orientation = "horizontal",
  signal = "selection",
  children,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      orientation={orientation}
      // `--gap` feeds the spacing between separate keys; the shared slot ignores it
      style={{ "--gap": spacing } as CSSProperties}
      className={cn(toggleGroupClasses, className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation, signal }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

/*===== Toggle Group Item =====*/

export type ToggleGroupItemProps = TogglePrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    signal?: LedProps["signal"];
  };

/** One latch key in a group. Its LED lights while it is selected; size and variant come from the group. */
function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  signal,
  ...props
}: ToggleGroupItemProps) {
  const context = useContext(ToggleGroupContext);
  const classes = cn(
    toggleVariants({ variant: context.variant || variant, size: context.size || size }),
    toggleGroupItemClasses,
  );

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      {...props}
      className={typeof className === "function" ? (state) => cn(classes, className(state)) : cn(classes, className)}
      render={(renderProps, state) => (
        <button type="button" {...renderProps}>
          <Led signal={signal ?? context.signal} state={state.pressed ? "on" : "off"} size="sm" />
          {children}
        </button>
      )}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
