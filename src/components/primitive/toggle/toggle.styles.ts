import { cva } from "class-variance-authority";
import { keycapVariants, twKeycapTone } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Shared Styles =====*/

const twSharedStyles = defineStyles({
  // `group/toggle` lets the LED and legend react to the latched state
  layout: "group/toggle",
  icon: "[&_svg:not([class*='size-'])]:size-4",
});

/*===== Appearance =====*/

// A toggle is a latch key: the same keycap as a button, but it stays sunk while on (the recipe's `data-pressed`
// state) and lights its LED. `default` is the light key; `outline` the flat plate for quieter toolbars.
//
// `tab` is no keycap but a folder tab standing on a ruled edge, for switches that open what sits under them (the task
// drawer's columns). Off, it is a tray, sunk and dim; on, it takes the border and the leaf colour (`bg-leaf`) of the
// panel under it and steps down one pixel over the rule, so it joins the panel it opened. The parent draws the rule
// (`border-b`), stands the tabs on it (`items-end`) and lays the panel on `bg-leaf`.
const twVariant = defineStyles({
  default: { appearance: joinStyles(twKeycapTone.light) },
  outline: { appearance: joinStyles(twKeycapTone.flat) },
  tab: {
    layout: "relative isolate inline-flex shrink-0 items-center justify-center",
    geometry: "rounded-t-chassis border border-b-0 border-transparent",
    typography: "font-heading text-button whitespace-nowrap",
    appearance:
      "bg-transparent text-muted-foreground after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:rounded-[inherit] after:bg-tray after:shadow-tray",
    interaction: "cursor-pointer transition-colors duration-75 outline-none select-none",
    hover: "hover:text-foreground",
    state:
      "data-pressed:-mb-px data-pressed:border-border data-pressed:text-foreground data-pressed:after:bg-leaf data-pressed:after:shadow-none",
    focus: "focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  },
});

/*===== Geometry =====*/

// `sm` is the compact scale (32px) for dense toolbars and lives beside a label; `md` (40px) keeps the compact scale
// at a full tap target, to sit in a row with `sm` buttons and selects; `default` and `lg` are the full-size keys.
// Every key's cut sits 2–3px outside its box, so neighbours need at least `gap-2`.
const twSize = defineStyles({
  sm: {
    layout: "gap-1.5",
    geometry: "h-8 min-w-8 px-3",
    geometryIcon: "has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
    typography: "text-caption font-semibold",
  },
  md: {
    layout: "gap-1.5",
    geometry: "h-10 min-w-10 px-3.5",
    geometryIcon: "has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
  },
  default: {
    layout: "gap-2",
    geometry: "h-11 min-w-11 px-4",
    geometryIcon: "has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
  },
  lg: {
    layout: "gap-2",
    geometry: "h-12 min-w-12 px-5",
    geometryIcon: "has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
  },
});

/*===== Class Composition =====*/

const toggleVariants = cva(joinStyles(twSharedStyles), {
  variants: {
    variant: composeStyles(twVariant),
    size: composeStyles(twSize),
  },
  // Scale (radius, bevel, cut width, press depth) follows the size, as on Button. A tab is no keycap.
  compoundVariants: [
    {
      variant: ["default", "outline"],
      size: ["default", "lg"],
      className: keycapVariants({ tone: null, scale: "regular" }),
    },
    {
      variant: ["default", "outline"],
      size: ["sm", "md"],
      className: keycapVariants({ tone: null, scale: "compact" }),
    },
    { variant: "default", size: ["default", "lg"], className: "after:shadow-keycap" },
    { variant: "default", size: ["sm", "md"], className: "after:shadow-keycap-compact" },
  ],
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export { toggleVariants, twVariant, twSize };
