import { defineStyles, joinStyles } from "../styles";

/*===== Group Styles =====*/

const twGroupStyles = defineStyles({
  layout: "flex h-full w-full aria-[orientation=vertical]:flex-col",
});

/*===== Handle Styles =====*/

// A printed rule between the housing's sections, the same hairline as a separator. It lights orange while it is
// hovered or dragged, so the rule reads as something that moves. The `after:` strip widens the grab area past the
// hairline without changing layout.
const twHandleStyles = defineStyles({
  layout:
    "relative flex items-center justify-center after:absolute after:inset-y-0 after:start-1/2 after:-translate-x-1/2 aria-[orientation=horizontal]:after:start-0 aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 rtl:after:translate-x-1/2 rtl:aria-[orientation=horizontal]:after:-translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
  geometry:
    "w-px after:w-2 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full",
  appearance: "bg-border",
  interaction: "transition-colors",
  hover: "data-[separator=hover]:bg-ring",
  active: "data-[separator=active]:bg-ring",
  focus:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  motion: "motion-reduce:transition-none",
});

// The grip printed on the rule's middle, shown with `withHandle`: a short raised bar that follows the rule's colour.
const twGripStyles = defineStyles({
  layout: "z-10 shrink-0",
  geometry: "h-6 w-1 rounded-chassis",
  appearance: "bg-border in-data-[separator=active]:bg-ring in-data-[separator=hover]:bg-ring",
});

/*===== Class Composition =====*/

const resizablePanelGroupClasses = joinStyles(twGroupStyles);
const resizableHandleClasses = joinStyles(twHandleStyles);
const resizableGripClasses = joinStyles(twGripStyles);

export { resizableGripClasses, resizableHandleClasses, resizablePanelGroupClasses };
