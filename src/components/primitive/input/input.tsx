import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "#/lib/utils";
import type { ComponentProps } from "react";
import { inputClasses, inputControlClasses } from "./input.styles";

/*===== Input =====*/

export type InputProps = ComponentProps<"input">;

/**
 * A text field: a recessed plate seated in a cut. An `<input>` can't draw pseudo-elements, so a wrapper span carries
 * the cut and plate and the native input sits transparent inside it.
 *
 * `className` goes on the wrapper, because consumers may only pass layout (width, margins, grid placement) and that
 * belongs on the outer box. Every other prop, the ref included, goes to the native input.
 */
function Input({ className, ...props }: InputProps) {
  return (
    <span data-slot="input-control" className={cn(inputControlClasses, className)}>
      <InputPrimitive data-slot="input" {...props} className={inputClasses} />
    </span>
  );
}

export { Input };
