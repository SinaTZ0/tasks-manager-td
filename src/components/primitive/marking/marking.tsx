import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { markingVariants } from "./marking.styles";

/*===== Marking =====*/

export type MarkingProps = ComponentProps<"span"> & VariantProps<typeof markingVariants>;

/**
 * Text printed on the housing next to a part. The `code` variant isolates its content as LTR, so an id like `TD-42`
 * or a shortcut like `⌘K` is never reordered by the Persian around it. A `reading` is isolated but takes its own
 * direction: a count like `۰/۲` reads left to right, a date like `۱۱ آبان` right to left.
 */
function Marking({ className, variant, children, ...props }: MarkingProps) {
  return (
    <span data-slot="marking" {...props} className={cn(markingVariants({ variant }), className)}>
      {variant === "code" ? <bdi dir="ltr">{children}</bdi> : variant === "reading" ? <bdi>{children}</bdi> : children}
    </span>
  );
}

export { Marking };
