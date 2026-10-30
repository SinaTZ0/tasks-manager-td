import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "#/lib/utils";

import { switchClasses, switchThumbClasses } from "./switch.styles";

/*===== Switch =====*/

/**
 * A rocker switch for settings that take effect at once (auto-pause, notifications). Pair it with a label so the
 * whole row toggles it: the default is 32px tall and `sm` 24px, under the 40px tap target on their own.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      {...props}
      className={
        typeof className === "function" ? (state) => cn(switchClasses, className(state)) : cn(switchClasses, className)
      }
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={switchThumbClasses} />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
