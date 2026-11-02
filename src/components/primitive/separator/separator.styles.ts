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
  // An old ticket's tear line: a row of punched holes (`perforation`, styles.css) with a round notch cut into the sheet
  // at each end, so each section reads as a stub to tear off and take on its own. The notches are whole circles of
  // sunk tray centred on the rule's ends: laid edge to edge (layout's negative margin) in a parent that clips, they
  // show as half circles bitten out of its sides. Horizontal only.
  perforated: joinStyles(
    defineStyles({
      layout: "relative",
      geometry: "h-1.5 self-stretch",
      appearance: "perforation",
      appearanceNotches:
        "before:absolute before:-inset-s-3 before:top-1/2 before:size-6 before:-translate-y-1/2 before:rounded-full before:bg-tray before:shadow-tray after:absolute after:-inset-e-3 after:top-1/2 after:size-6 after:-translate-y-1/2 after:rounded-full after:bg-tray after:shadow-tray",
    }),
  ),
};

/*===== Class Composition =====*/

const separatorVariants = cva(joinStyles(twSeparatorStyles), {
  variants: { variant: twVariant },
  defaultVariants: { variant: "default" },
});

export { separatorVariants };
