import { defineStyles, joinStyles } from "../styles";

/*===== Label Styles =====*/

// A label is printed on the housing beside its part, like silkscreen: the instrument face, a touch of tracking and the
// muted ink. Muted ink is 5.9:1 on the housing; labels are not set straight on the desk, where it falls under 4.5:1.
const twLabelStyles = defineStyles({
  layout: "flex items-center gap-2",
  typography: "font-heading text-body-sm font-semibold tracking-marking",
  appearance: "text-muted-foreground",
  interaction: "select-none",
  // A label follows the disabled state of its Field group or of the control just before it.
  disabled:
    "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-45 peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
});

/*===== Class Composition =====*/

const labelClasses = joinStyles(twLabelStyles);

export { labelClasses };
