import { cva } from "class-variance-authority";
import { keycapVariants, slotClasses } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Tabs Styles =====*/

const twTabsStyles = defineStyles({
  layout: "group/tabs flex gap-4 data-horizontal:flex-col",
});

/*===== List Styles =====*/

const twListStyles = defineStyles({
  layout: "group/tabs-list inline-flex w-fit group-data-vertical/tabs:flex-col",
});

// `default` is a row of keys seated in one long cut, like a sampler's mode keys. `line` is printed on the housing with
// no keys, for quieter in-panel navigation. `data-variant` stays on the list for consumers that style from it.
const twVariant = defineStyles({
  default: {
    appearance: slotClasses,
  },
  line: {
    layout: "items-center gap-1",
  },
});

/*===== Trigger Styles =====*/

const twTriggerShared = defineStyles({
  // `group/tabs-trigger` lets the LED light from the tab's own state
  layout:
    "group/tabs-trigger flex-1 gap-2 group-data-vertical/tabs:w-full group-data-vertical/tabs:flex-none group-data-vertical/tabs:justify-start",
  geometry: "h-10 px-4",
  geometryIcon: "has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
  icon: "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
});

const twTriggerVariant = defineStyles({
  // A light keycap without its own cut: the list is the void. The active tab stays sunk (`data-active` in the
  // keycap recipe) and lights its LED. The focus ring is drawn inside the face in `foreground`: outside it would land
  // on the black cut, where the light theme's near-black ring disappears.
  default: {
    appearance: keycapVariants({ tone: "light", scale: "compact" }),
    appearanceCut: "before:hidden",
    focus: "focus-visible:-outline-offset-4 focus-visible:outline-foreground",
  },
  // Printed legend: muted until active, when it turns foreground and lights the LED. Never colour alone.
  line: {
    layout: "relative inline-flex shrink-0 items-center justify-center",
    typography: "font-heading text-button whitespace-nowrap",
    appearance: "rounded-keycap-compact text-muted-foreground",
    interaction: "cursor-pointer transition-colors duration-75 outline-none select-none",
    hover: "hover:bg-accent hover:text-foreground",
    state: "data-active:text-foreground",
    focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    disabled: "data-disabled:pointer-events-none data-disabled:opacity-45",
  },
});

/*===== Indicator Styles =====*/

// The tab's LED is unlit grey plastic until the tab is active, then glows in the selection colour.
const twIndicatorStyles = defineStyles({
  state:
    "group-data-disabled/tabs-trigger:opacity-60 group-data-active/tabs-trigger:bg-current group-data-active/tabs-trigger:shadow-led-on",
});

/*===== Content Styles =====*/

const twContentStyles = defineStyles({
  layout: "flex-1",
  typography: "text-body-sm",
  focus: "outline-none",
});

/*===== Class Composition =====*/

const tabsClasses = joinStyles(twTabsStyles);

const tabsListVariants = cva(joinStyles(twListStyles), {
  variants: {
    variant: composeStyles(twVariant),
  },
  defaultVariants: { variant: "default" },
});

const tabsTriggerVariants = cva(joinStyles(twTriggerShared), {
  variants: {
    variant: composeStyles(twTriggerVariant),
  },
  defaultVariants: { variant: "default" },
});

const tabsIndicatorClasses = joinStyles(twIndicatorStyles);
const tabsContentClasses = joinStyles(twContentStyles);

export { tabsClasses, tabsListVariants, tabsTriggerVariants, tabsIndicatorClasses, tabsContentClasses, twVariant };
