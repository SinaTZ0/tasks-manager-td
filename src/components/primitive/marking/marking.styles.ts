import { cva } from "class-variance-authority";
import { markingClasses, readoutClasses } from "../instrument.styles";

/*===== Variants =====*/

// Both looks come from instrument.styles.ts, so other primitives can print the same marking without this component
const twVariant = {
  // Silkscreen words: panel names, value labels, column headings
  default: markingClasses,
  // Codes, ids, counts and shortcuts in the instrument mono
  code: readoutClasses,
};

const markingVariants = cva("", {
  variants: { variant: twVariant },
  defaultVariants: { variant: "default" },
});

export { markingVariants, twVariant };
