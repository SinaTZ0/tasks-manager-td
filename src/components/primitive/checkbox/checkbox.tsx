import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "#/lib/utils";

import { checkboxClasses, checkboxIndicatorClasses } from "./checkbox.styles";

/*===== Checkbox =====*/

/**
 * A check key. Pair it with a label (`Field` with `FieldLabel`, or a wrapping `<label>`) so the whole row is the tap
 * target. The indicator is an LED, not a tick: it appears only while checked, and the sunk key repeats the state.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(checkboxClasses, className(state))
          : cn(checkboxClasses, className)
      }
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={checkboxIndicatorClasses} />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
