import { cva } from "class-variance-authority";
import { keycapVariants, twKeycapTone } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Shared Styles =====*/

const twSharedStyles = defineStyles({
  // `group/button` lets icons and labels react to the button's own state
  layout: "group/button",
  icon: "[&_svg:not([class*='size-'])]:size-4.5",
});

/*===== Appearance =====*/

// Each variant is a keycap material (instrument.styles.ts), except `ghost` and `link`, which are printed on the housing
// with no cut. One `highlight` (the orange key) per view: the page's main call to action. `default` is the graphite
// function key for in-app actions; `secondary` the light key for everything else.
const twVariant = defineStyles({
  default: {
    appearance: joinStyles(twKeycapTone.graphite),
  },
  highlight: {
    appearance: joinStyles(twKeycapTone.highlight),
  },
  secondary: {
    appearance: joinStyles(twKeycapTone.light),
  },
  // A blank plate flush with the housing: quieter than a raised key, still clearly a control
  outline: {
    appearance: joinStyles(twKeycapTone.flat),
  },
  destructive: {
    appearance: joinStyles(twKeycapTone.danger),
  },
  ghost: {
    layout: "relative inline-flex shrink-0 items-center justify-center",
    geometry: "rounded-keycap-compact",
    typography: "font-heading text-button whitespace-nowrap",
    appearance: "text-foreground",
    interaction: "transition-colors duration-75 outline-none select-none",
    hover: "hover:bg-accent",
    state: "aria-expanded:bg-accent",
    focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    disabled: "data-disabled:pointer-events-none data-disabled:opacity-45",
  },
  link: {
    layout: "relative inline-flex shrink-0 items-center justify-center",
    typography: "font-heading text-button whitespace-nowrap",
    appearance: "text-brand-text underline-offset-4",
    interaction: "outline-none select-none",
    hover: "hover:underline",
    focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    disabled: "data-disabled:pointer-events-none data-disabled:opacity-45",
  },
});

/*===== Geometry =====*/

// Heights line up with the 44px fields. Every part's cut sits 2–3px outside its box, so neighbours need a gap of at
// least `gap-2` to keep their cuts apart. Compact sizes (xs, sm, icon-xs, icon-sm) take the compact keycap scale.
// `geometryIcon` tightens the padding on the side holding a `data-icon` child so the icon looks optically centered.
const twSize = defineStyles({
  xs: {
    layout: "gap-1",
    geometry: "h-8 px-3",
    geometryIcon: "has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
    typography: "text-caption font-semibold",
    icon: "[&_svg:not([class*='size-'])]:size-4",
  },
  sm: {
    layout: "gap-1.5",
    geometry: "h-10 px-4",
    geometryIcon: "has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
    icon: "[&_svg:not([class*='size-'])]:size-4",
  },
  default: {
    layout: "gap-2",
    geometry: "h-11 px-5",
    geometryIcon: "has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
  },
  lg: {
    layout: "gap-2",
    geometry: "h-12 px-6",
    geometryIcon: "has-data-[icon=inline-end]:pe-5 has-data-[icon=inline-start]:ps-5",
  },
  "icon-xs": {
    geometry: "size-8",
    icon: "[&_svg:not([class*='size-'])]:size-4",
  },
  "icon-sm": {
    geometry: "size-10",
    icon: "[&_svg:not([class*='size-'])]:size-4",
  },
  icon: {
    geometry: "size-11",
  },
  "icon-lg": {
    geometry: "size-12",
    icon: "[&_svg:not([class*='size-'])]:size-5",
  },
});

/*===== Class Composition =====*/

const compactSizes = ["xs", "sm", "icon-xs", "icon-sm"] as const;
const regularSizes = ["default", "lg", "icon", "icon-lg"] as const;
const keycapTones = ["default", "highlight", "secondary", "outline", "destructive"] as const;

const buttonVariants = cva(joinStyles(twSharedStyles), {
  variants: {
    variant: composeStyles(twVariant),
    size: composeStyles(twSize),
  },
  // The keycap scale (radius, bevel, cut width, press depth) follows the size, so a 32px key isn't drawn with
  // full-size proportions. Ghost and link have no keycap, so they skip it.
  compoundVariants: [
    {
      variant: [...keycapTones],
      size: [...regularSizes],
      className: keycapVariants({ tone: null, scale: "regular" }),
    },
    {
      variant: [...keycapTones],
      size: [...compactSizes],
      className: keycapVariants({ tone: null, scale: "compact" }),
    },
    // The bevel depends on material and scale together
    { variant: "default", size: [...regularSizes], className: "after:shadow-keycap-graphite" },
    { variant: "default", size: [...compactSizes], className: "after:shadow-keycap-graphite-compact" },
    { variant: "highlight", size: [...regularSizes], className: "after:shadow-keycap-highlight" },
    { variant: "highlight", size: [...compactSizes], className: "after:shadow-keycap-highlight-compact" },
    { variant: ["secondary", "destructive"], size: [...regularSizes], className: "after:shadow-keycap" },
    { variant: ["secondary", "destructive"], size: [...compactSizes], className: "after:shadow-keycap-compact" },
  ],
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export { buttonVariants, twVariant, twSize };
