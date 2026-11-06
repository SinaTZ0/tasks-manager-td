import { twFieldPlate } from "../input/input.styles";
import { richTextProseClasses } from "../rich-text/rich-text.styles";
import { defineStyles, joinStyles } from "../styles";

/*===== Field Plate =====*/

// The same recessed plate in a cut as Input and Textarea (input.styles.ts), stacked as a column: the toolbar strip on
// top, the writing surface below. Only the layout group differs; the plate, cut and its timing are shared.
const twEditorControl = defineStyles({
  ...twFieldPlate,
  layout: "relative isolate flex min-w-0 flex-col",
});

// Focus lights the cut orange, but only while the writing surface has it: the toolbar's keys draw their own rings, and
// the cut is the field's cue, not theirs. Invalid lights it yellow while unfocused, as on Input; FieldError says why.
const twEditorControlState = defineStyles({
  focus: "has-[[contenteditable]:focus]:before:bg-cut-focus",
  invalid: "has-[[aria-invalid=true]:not(:focus)]:before:bg-signal-attention",
  disabled:
    "data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:after:bg-field-disabled",
});

/*===== Toolbar =====*/

// A row of compact keys printed across the top of the plate, ruled off from the text. The keys keep their own cuts,
// so they sit at least `gap-2` apart; the rule between groups is a printed line, not a part.
const twToolbarStyles = defineStyles({
  layout: "flex flex-wrap items-center gap-2",
  geometry: "border-b border-border px-3 py-2.5",
});

const twToolbarDividerStyles = defineStyles({
  geometry: "mx-1 h-5 w-px",
  appearance: "bg-border",
});

/*===== Writing Surface =====*/

// The ProseMirror element: the shared prose look, padded like a textarea, starting two lines tall and growing with
// its text. The placeholder is drawn on the first empty paragraph (Tiptap's Placeholder marks it `is-editor-empty`),
// floated so the caret stays at its start.
const twSurfaceStyles = defineStyles({
  layout: "flex-1",
  geometry: "px-4 py-3",
  // 16px on a phone, like every field: iOS Safari zooms in on anything smaller when it takes the focus.
  typography: "max-md:text-body-lg",
  appearance: "caret-highlight",
  interaction: "outline-none",
  disabled: "aria-disabled:cursor-not-allowed",
  statePlaceholder:
    "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-start [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
});

// The surface's holder keeps the two-line height before hydration too, when Tiptap hasn't drawn the surface yet, so the
// page doesn't jump when it appears.
const twContentStyles = defineStyles({
  layout: "flex flex-col",
  geometry: "min-h-28",
});

/*===== Link Form =====*/

// Fills the popover's own width (w-72), inside its padding.
const twLinkFormStyles = defineStyles({
  layout: "flex flex-col gap-3",
});

/*===== Class Composition =====*/

const richTextEditorControlClasses = `${joinStyles(twEditorControl)} ${joinStyles(twEditorControlState)}`;
const richTextEditorToolbarClasses = joinStyles(twToolbarStyles);
const richTextEditorDividerClasses = joinStyles(twToolbarDividerStyles);
const richTextEditorSurfaceClasses = `${richTextProseClasses} ${joinStyles(twSurfaceStyles)}`;
const richTextEditorLinkFormClasses = joinStyles(twLinkFormStyles);
const richTextEditorContentClasses = joinStyles(twContentStyles);

export {
  richTextEditorContentClasses,
  richTextEditorControlClasses,
  richTextEditorDividerClasses,
  richTextEditorLinkFormClasses,
  richTextEditorSurfaceClasses,
  richTextEditorToolbarClasses,
};
