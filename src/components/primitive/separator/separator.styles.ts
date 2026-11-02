import { cva } from "class-variance-authority";
import { defineStyles, joinStyles } from "../styles";

/*===== Separator Styles =====*/

const twSeparatorStyles = defineStyles({
  layout: "shrink-0 data-vertical:self-stretch",
});

/*===== Variants =====*/

const twVariant = {
  // A printed rule on the housing, the same hairline that rules off card headers and footers
  default: joinStyles(
    defineStyles({
      geometry: "data-horizontal:h-px data-horizontal:w-full data-vertical:w-px",
      appearance: "bg-border",
    }),
  ),
  // A section break, the dashed rule the board prints between its cards: heavier than a hairline and broken, so a
  // long panel reads as parts to take one at a time instead of one ruled form.
  dashed: joinStyles(
    defineStyles({
      geometry:
        "data-horizontal:h-0 data-horizontal:w-full data-horizontal:border-t-2 data-vertical:w-0 data-vertical:border-s-2",
      appearance: "border-dashed border-muted-foreground/60",
    }),
  ),
};

/*===== Class Composition =====*/

const separatorVariants = cva(joinStyles(twSeparatorStyles), {
  variants: { variant: twVariant },
  defaultVariants: { variant: "default" },
});

export { separatorVariants };
