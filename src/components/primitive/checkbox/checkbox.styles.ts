import { keycapVariants } from "../instrument.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Root =====*/

// A check key: a 20px compact keycap that latches. Checked, it sinks into its cut like a held key and lights an
// orange LED in its face, so the state reads without the tick shape or colour alone. The key is small because it
// lives in dense rows (checklists, table selections); its tap target is the whole row, through its label (Field).
const twRootStyles = defineStyles({
  layout: "peer",
  geometry: "size-5",
  appearance: keycapVariants({ tone: "light", scale: "compact" }),
  appearanceBevel: "after:shadow-keycap-compact",
  state:
    "data-checked:after:inset-press-compact data-checked:after:shadow-keycap-pressed-compact data-checked:after:brightness-92",
  // An invalid check key gets a yellow cut: yellow is the attention signal (docs/frontend/app-identity.md)
  invalid: "aria-invalid:before:bg-signal-attention data-invalid:before:bg-signal-attention",
});

/*===== Indicator =====*/

const twIndicatorStyles = defineStyles({
  layout: "block",
  geometry: "size-2 rounded-xs",
  appearance: "bg-current text-signal-action shadow-led-on",
});

/*===== Class Composition =====*/

const checkboxClasses = joinStyles(twRootStyles);
const checkboxIndicatorClasses = joinStyles(twIndicatorStyles);

export { checkboxClasses, checkboxIndicatorClasses };
