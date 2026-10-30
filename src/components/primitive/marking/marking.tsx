import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";
import { markingVariants } from "./marking.styles";

/*===== Marking =====*/

export type MarkingProps = ComponentProps<"span"> & VariantProps<typeof markingVariants>;

/**
 * Text printed on the housing next to a part. The `code` variant isolates its content as LTR, so an id like `TD-42`
 * or a shortcut like `⌘K` is never reordered by the Persian around it.
 */
function Marking({ className, variant, children, ...props }: MarkingProps) {
  return (
    <span data-slot="marking" {...props} className={cn(markingVariants({ variant }), className)}>
      {variant === "code" ? <bdi dir="ltr">{children}</bdi> : children}
    </span>
  );
}

export { Marking };
