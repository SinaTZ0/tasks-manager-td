import { defineStyles, joinStyles } from "../styles";

/*===== Spinner Styles =====*/

// A calm, slow turn. Under reduced motion it stands still; its `role="status"` name still says it is loading.
const twSpinnerStyles = defineStyles({
  geometry: "size-4",
  motion: "motion-safe:animate-spin motion-safe:[animation-duration:1.2s]",
});

/*===== Class Composition =====*/

const spinnerClasses = joinStyles(twSpinnerStyles);

export { spinnerClasses };
