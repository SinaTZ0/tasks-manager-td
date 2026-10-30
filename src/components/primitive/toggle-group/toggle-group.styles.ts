import { defineStyles, joinStyles } from "../styles";

/*===== Group =====*/

// `spacing` 0 (the default) seats every key in one long slot, like a mode strip on a sampler: the slot's background
// is the void, so the gaps between keys read as the same black gap as a single cut. A positive `spacing` lays the
// keys out separately, each in its own cut, for pads that deserve their own hole.
const twGroupStyles = defineStyles({
  layout: "group/toggle-group flex w-fit flex-row data-vertical:flex-col data-vertical:items-stretch",
  geometry: "gap-[--spacing(var(--gap))]",
  // The slot (`slotClasses` in instrument.styles.ts) only exists at spacing 0; its padding and gap replace `--gap`.
  // Written out in full because Tailwind only generates classes it can read in the source.
  state:
    "data-[spacing=0]:items-stretch data-[spacing=0]:gap-cut data-[spacing=0]:rounded-chassis data-[spacing=0]:bg-cut data-[spacing=0]:p-cut data-[spacing=0]:shadow-cut",
});

/*===== Item =====*/

const twItemStyles = defineStyles({
  // Keys in a slot are one part of it: they drop their own cut, and a horizontal strip shares any width beyond what the
  // keys need. Each starts at its content's width (`flex-auto`, not `flex-1`), so a key with a longer word isn't cut
  // short to match the others. (In a vertical strip it would crush each key's height.)
  layout:
    "group-data-[orientation=horizontal]/toggle-group:group-data-[spacing=0]/toggle-group:flex-auto group-data-[spacing=0]/toggle-group:before:hidden",
  // Keyboard focus moves along the strip; keep the ring above the neighbouring key
  focus: "focus-visible:z-10",
});

/*===== Class Composition =====*/

const toggleGroupClasses = joinStyles(twGroupStyles);
const toggleGroupItemClasses = joinStyles(twItemStyles);

export { toggleGroupClasses, toggleGroupItemClasses };
