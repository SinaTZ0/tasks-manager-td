import { cva } from "class-variance-authority";

import { twCut } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Field Plate =====*/

// A field is a recessed plate seated in a cut, the same cut a keycap sits in (instrument.styles.ts). The plate is
// painted on `::after` because the `::before` cut would paint over a background on the element itself. Textarea,
// InputGroup and the Select trigger reuse these groups, so every text entry looks like the same part.
const twFieldPlate = defineStyles({
  layout: "relative isolate flex min-w-0 items-center",
  geometry: "rounded-keycap",
  appearancePlate:
    "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:bg-field after:shadow-field",
  appearanceCut: joinStyles(twCut.regular),
  interaction: "before:transition-colors before:duration-75",
});

// Focus lights the cut orange: the whole 3px ring around the plate changes, which clears 3:1 against the housing.
// An invalid control lights it yellow (attention), but only while unfocused, so focus always shows where you are.
// The error itself is said in words by FieldError; the yellow cut is the second cue, never the only one.
const twFieldPlateState = defineStyles({
  focus: "has-[:focus-visible]:before:bg-cut-focus",
  invalid: "has-[[aria-invalid=true]:not(:focus-visible)]:before:bg-signal-attention",
  // A disabled field keeps its cut (the part is still there) but its plate goes flat and its text muted
  disabled: "has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:after:bg-field-disabled",
});

// A quiet plate reads as printed text until it is pointed at: the cut and plate stay hidden, and come up on hover, on
// focus, while its popup is open, or when its value is invalid (so the yellow cut still shows). For a sheet of values
// read far more often than changed (a task's details). A disabled one stays text on hover.
const twQuietPlate = defineStyles({
  appearance: "before:opacity-0 after:opacity-0",
  hover: "hover:before:opacity-100 hover:after:opacity-100",
  focus: "has-[:focus-visible]:before:opacity-100 has-[:focus-visible]:after:opacity-100",
  state: "has-data-popup-open:before:opacity-100 has-data-popup-open:after:opacity-100",
  invalid: "has-[[aria-invalid=true]]:before:opacity-100 has-[[aria-invalid=true]]:after:opacity-100",
  disabled: "has-disabled:hover:before:opacity-0 has-disabled:hover:after:opacity-0",
});

/*===== Native Control =====*/

// The native element is transparent inside the plate and draws no focus ring of its own: the cut shows focus.
const twNativeControl = defineStyles({
  layout: "w-full min-w-0 flex-1 self-stretch",
  geometry: "rounded-[inherit] border-0",
  // `body-lg` is 16px, which keeps iOS Safari from zooming in on focus
  typography: "text-body-lg",
  appearance: "bg-transparent text-foreground caret-highlight placeholder:text-muted-foreground",
  interaction: "outline-none",
  disabled: "disabled:cursor-not-allowed disabled:text-muted-foreground",
  // Chrome paints autofilled inputs with its own colour, which shows as a box inside the plate. An inset shadow in the
  // plate's colour is the reliable way to cover it.
  stateAutofill:
    "autofill:shadow-[inset_0_0_0_100px_var(--field)] autofill:[-webkit-text-fill-color:var(--foreground)]",
});

/*===== Input Styles =====*/

const twInputControl = defineStyles({
  // Same 44px as the default button, so a field and its key line up in one row
  geometry: "h-11",
});

const twInputStyles = defineStyles({
  geometry: "px-4 py-1",
  // The native file-picker button inside `type="file"` inputs, printed on the plate
  appearanceFile:
    "file:me-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-heading file:text-body-sm file:font-semibold file:text-foreground",
});

/*===== Class Composition =====*/

const fieldPlateClasses = `${joinStyles(twFieldPlate)} ${joinStyles(twFieldPlateState)}`;
const quietPlateClasses = joinStyles(twQuietPlate);
const nativeControlClasses = joinStyles(twNativeControl);
const inputControlClasses = `${fieldPlateClasses} ${joinStyles(twInputControl)}`;
const inputClasses = `${nativeControlClasses} ${joinStyles(twInputStyles)}`;

// `code` is for values typed as codes or numbers (a project key, a limit, a password the admin passes on): the
// instrument mono, so each character reads unambiguously. Set `dir="ltr"` with it.
const twInputVariant = {
  default: "",
  code: "font-mono",
};

const inputVariants = cva(inputClasses, {
  variants: { variant: twInputVariant },
  defaultVariants: { variant: "default" },
});

export {
  fieldPlateClasses,
  inputClasses,
  inputVariants,
  twInputVariant,
  inputControlClasses,
  nativeControlClasses,
  quietPlateClasses,
  twFieldPlate,
  twFieldPlateState,
  twNativeControl,
};
