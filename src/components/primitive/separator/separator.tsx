import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type { VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import { separatorVariants } from "./separator.styles";

/*===== Separator =====*/

export type SeparatorProps = SeparatorPrimitive.Props & VariantProps<typeof separatorVariants>;

/** A printed rule: a hairline by default, or `dashed` for a break between sections of a long panel. */
function Separator({ className, orientation = "horizontal", variant, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(separatorVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Separator };
