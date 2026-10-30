import { fieldPlateClasses, nativeControlClasses } from "../input/input.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Textarea Styles =====*/

// The same plate and cut as Input (input.styles.ts); only the height is free.
const twTextareaControl = defineStyles({
  layout: "items-stretch",
});

const twTextareaStyles = defineStyles({
  // `field-sizing-content` grows the textarea with its content, starting from `min-h-28`
  layout: "field-sizing-content",
  geometry: "min-h-28 px-4 py-3",
  interaction: "resize-y",
});

/*===== Class Composition =====*/

const textareaControlClasses = `${fieldPlateClasses} ${joinStyles(twTextareaControl)}`;
const textareaClasses = `${nativeControlClasses} ${joinStyles(twTextareaStyles)}`;

export { textareaClasses, textareaControlClasses };
