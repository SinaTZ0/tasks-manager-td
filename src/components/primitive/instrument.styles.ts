import { cva, type VariantProps } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "./styles";

/*
 * The instrument recipe: one physical model shared by every pressable or seated part (docs/frontend/components.md →
 * The Instrument Model). A part sits in a machined cut in the housing; the keycap is the molded face inside it.
 *
 * - The element itself is transparent and `isolate`, so its pseudo-elements stack behind its content.
 * - `::before` (z -2) is the cut: the near-black void, larger than the part by the cut gap, with the cut's shading.
 * - `::after` (z -1) is the keycap face, so a press can shrink it inside the cut without moving the layout.
 *
 * Never give a part's root a background: the `::before` cut paints over it. Put the colour on `::after`.
 */

/*===== Cut =====*/

const twCut = defineStyles({
  regular: {
    layout: "before:pointer-events-none before:absolute before:-z-2",
    geometry: "before:-inset-cut before:rounded-chassis",
    appearance: "before:bg-cut before:shadow-cut",
  },
  compact: {
    layout: "before:pointer-events-none before:absolute before:-z-2",
    geometry: "before:-inset-cut-compact before:rounded-chassis-compact",
    appearance: "before:bg-cut before:shadow-cut",
  },
});

/** The cut alone, for parts whose face is not a keycap (fields, switch tracks, display windows). */
const cutVariants = cva("", {
  variants: { scale: composeStyles(twCut) },
  defaultVariants: { scale: "regular" },
});

/*===== Slot =====*/

/**
 * A long open cut holding several parts side by side (a toggle group, a tab list). The host's own background is the
 * void, so the padding and gaps between parts read as the same black gap as a single cut. Parts inside a slot drop
 * their own cut with `in-data-[slot=…]:before:hidden`.
 */
const twSlot = defineStyles({
  layout: "inline-flex items-stretch",
  geometry: "gap-cut rounded-chassis p-cut",
  appearance: "bg-cut shadow-cut",
});

const slotClasses = joinStyles(twSlot);

/*===== Keycap =====*/

const twKeycapShared = defineStyles({
  layout: "relative isolate inline-flex shrink-0 items-center justify-center",
  appearance: "border-0 bg-transparent",
  typography: "font-heading text-button whitespace-nowrap",
  // The molded face. `rounded-[inherit]` keeps it on the part's radius whatever size sets it.
  appearanceFace:
    "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:transition-[inset,box-shadow,filter] after:duration-75 after:ease-instrument",
  interaction: "cursor-pointer outline-none select-none",
  hover: "hover:after:brightness-105",
  // The focus ring sits outside the cut, so it never hides the void that defines the part
  focus:
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid",
  // A disabled key reads as a dead part: the face loses its colour and dims, and the legend goes muted. Grayscale
  // matters for the orange key; translucency alone turns it a muddy maroon over the void. The legend changes colour
  // rather than opacity because a text-only key has no child element to fade.
  disabled:
    "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:after:opacity-70 disabled:after:grayscale data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:after:opacity-70 data-disabled:after:grayscale",
  icon: "[&_svg]:pointer-events-none [&_svg]:shrink-0",
});

/*------ Tone ------*/

// `flat` is a plate flush with the housing: the cut without a raised cap, for quieter actions.
const twKeycapTone = defineStyles({
  light: { appearance: "text-keycap-foreground after:bg-keycap" },
  graphite: { appearance: "text-keycap-graphite-foreground after:bg-keycap-graphite" },
  highlight: { appearance: "text-highlight-foreground after:bg-highlight" },
  danger: { appearance: "text-destructive after:bg-destructive-surface" },
  flat: { appearance: "text-foreground after:bg-card" },
});

/*------ Scale ------*/

// Seen from above, a key sinking into its cut stays centred and shrinks a little, so the void widens evenly on every
// side. Translating it instead slides the key over the lower gap. Momentary keys sink on `:active`; latching parts
// (Toggle, Tab, Checkbox) hold the same state through `data-pressed`, `data-checked` or `data-active`. A plain button
// with `aria-pressed` and a link to the current page (`aria-current="page"`) latch the same way.
const twKeycapScale = defineStyles({
  regular: {
    geometry: "rounded-keycap",
    active:
      "active:after:inset-press active:after:shadow-keycap-pressed active:after:brightness-92 aria-pressed:after:inset-press aria-pressed:after:shadow-keycap-pressed aria-pressed:after:brightness-92 aria-[current=page]:after:inset-press aria-[current=page]:after:shadow-keycap-pressed aria-[current=page]:after:brightness-92 data-pressed:after:inset-press data-pressed:after:shadow-keycap-pressed data-pressed:after:brightness-92 data-active:after:inset-press data-active:after:shadow-keycap-pressed data-active:after:brightness-92",
  },
  compact: {
    geometry: "rounded-keycap-compact",
    focus: "focus-visible:outline-offset-3",
    active:
      "active:after:inset-press-compact active:after:shadow-keycap-pressed-compact active:after:brightness-92 aria-pressed:after:inset-press-compact aria-pressed:after:shadow-keycap-pressed-compact aria-pressed:after:brightness-92 aria-[current=page]:after:inset-press-compact aria-[current=page]:after:shadow-keycap-pressed-compact aria-[current=page]:after:brightness-92 data-pressed:after:inset-press-compact data-pressed:after:shadow-keycap-pressed-compact data-pressed:after:brightness-92 data-active:after:inset-press-compact data-active:after:shadow-keycap-pressed-compact data-active:after:brightness-92",
  },
});

/*------ Composition ------*/

/**
 * Every keycap: a tone (material) and a scale (regular for 40px and up, compact below). Primitives add their own
 * height, padding and type on top. Bevels are scaled with the key, because a full-size bevel floods a 32px face.
 */
const keycapVariants = cva(joinStyles(twKeycapShared), {
  variants: {
    tone: composeStyles(twKeycapTone),
    scale: composeStyles(twKeycapScale),
  },
  compoundVariants: [
    { tone: ["light", "danger"], scale: "regular", className: "after:shadow-keycap" },
    { tone: ["light", "danger"], scale: "compact", className: "after:shadow-keycap-compact" },
    { tone: "graphite", scale: "regular", className: "after:shadow-keycap-graphite" },
    { tone: "graphite", scale: "compact", className: "after:shadow-keycap-graphite-compact" },
    { tone: "highlight", scale: "regular", className: "after:shadow-keycap-highlight" },
    { tone: "highlight", scale: "compact", className: "after:shadow-keycap-highlight-compact" },
    // Every keycap carries its own cut, scaled with it
    { scale: "regular", className: joinStyles(twCut.regular) },
    { scale: "compact", className: joinStyles(twCut.compact) },
  ],
  defaultVariants: { tone: "light", scale: "regular" },
});

type KeycapVariantProps = VariantProps<typeof keycapVariants>;

/*===== Printed Markings =====*/

/** Silkscreen printed on the housing next to a part: panel names, key legends, value labels. */
const markingClasses = "font-heading text-marking tracking-marking text-muted-foreground";

/** A code or value printed in the instrument mono: task codes, shortcuts, counts. Always set inside `<bdi dir="ltr">`. */
const readoutClasses = "font-mono text-marking font-medium tracking-readout text-muted-foreground";

/**
 * A value read off a part in the instrument mono: a count, a date, time spent. Printed in full ink, one step up from a
 * marking, so the number stands out from the silkscreen naming it. Set inside a `<bdi>` that takes the text's own
 * direction (a Persian date reads right to left).
 */
// Set tight, unlike a readout, and without tabular figures: both pull Persian digits apart ("۱ ۱"). Plex Mono's Latin
// digits are one width already.
const readingClasses = "font-mono text-body-sm font-medium text-foreground";

export {
  cutVariants,
  keycapVariants,
  markingClasses,
  readingClasses,
  readoutClasses,
  slotClasses,
  twCut,
  twKeycapScale,
  twKeycapTone,
  type KeycapVariantProps,
};
