import { cn } from "#/lib/utils";
import type { ComponentProps } from "react";
import { textareaClasses, textareaControlClasses } from "./textarea.styles";

/*===== Textarea =====*/

export type TextareaProps = ComponentProps<"textarea">;

/**
 * A multi-line field, built like Input: a wrapper span carries the cut and plate, the native textarea sits transparent
 * inside it. `className` (layout only) goes on the wrapper; every other prop and the ref go to the textarea.
 */
function Textarea({ className, ...props }: TextareaProps) {
  return (
    <span data-slot="textarea-control" className={cn(textareaControlClasses, className)}>
      <textarea data-slot="textarea" {...props} className={textareaClasses} />
    </span>
  );
}

export { Textarea };
