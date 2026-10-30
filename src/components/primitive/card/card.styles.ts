import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Surface Styles =====*/

// A card is a housing module: the molded panel parts are mounted on. One thin shell edge and a hard ledge below
// (`shadow-housing`), no soft blur, so it sits on the desk instead of floating over it. Parts space themselves with
// `--card-spacing`, so a size only has to change that one variable.
const twCardStyles = defineStyles({
  layout: "group/card flex flex-col gap-(--card-spacing) overflow-hidden",
  geometry: "rounded-housing border py-(--card-spacing)",
  // The footer brings its own padding, so the card drops its bottom padding.
  geometryFooter: "has-data-[slot=card-footer]:pb-0",
  // Edge-to-edge media replaces the card's top padding; the card's `overflow-hidden` rounds its corners.
  geometryMedia: "has-[>[data-slot=card-media]:first-child]:pt-0 has-[>img:first-child]:pt-0",
  typography: "text-body-sm",
  // `surface-grain` is the moulded plastic's fine grain, blended into whatever colour the housing is
  appearance: "border-border bg-card surface-grain text-card-foreground shadow-housing",
  // A card rendered as a link (`render={<SiteLink … />}`) takes the quiet `accent` wash on hover and focus. It does
  // not lift: a housing is screwed to the desk.
  interaction: "transition-colors duration-150 ease-out outline-none",
  hover: "[a&]:hover:bg-accent",
  focus:
    "focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  motion: "motion-reduce:transition-none",
});

const twSize = defineStyles({
  default: {
    geometry: "[--card-spacing:--spacing(5)]",
  },
  sm: {
    geometry: "[--card-spacing:--spacing(4)]",
  },
});

/*===== Compound Part Styles =====*/

// The header is the module's printed strip: when anything follows it, a thin rule separates it from the body, the
// way a panel's name is silkscreened above its controls.
const twHeaderStyles = defineStyles({
  layout:
    "group/card-header @container/card-header grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
  geometry: "px-(--card-spacing) not-last:border-b not-last:pb-(--card-spacing)",
  appearance: "border-border",
});

const twTitleStyles = defineStyles({
  typography: "font-heading text-h3 group-data-[size=sm]/card:text-h4",
});

const twDescriptionStyles = defineStyles({
  typography: "text-body-sm",
  appearance: "text-muted-foreground",
});

const twActionStyles = defineStyles({
  layout: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
});

const twContentStyles = defineStyles({
  geometry: "px-(--card-spacing)",
});

// The footer is a printed strip under a thin rule, same material as the body
const twFooterStyles = defineStyles({
  layout: "flex items-center",
  geometry: "border-t px-(--card-spacing) py-4",
  appearance: "border-border",
});

/*===== Media Styles =====*/

// The media frame clips its image so the media zoom stays inside it. `bg-muted` shows while the image loads and
// around a contained poster.
const twMediaStyles = defineStyles({
  layout: "relative shrink-0 overflow-hidden",
  appearance: "bg-muted",
  geometry: "[&_img]:size-full",
  // The media zoom: the photo scales to 1.03 inside a hovered or focused link card.
  interaction: "[&_img]:transition-[scale] [&_img]:duration-300 [&_img]:ease-out",
  hover: "motion-safe:[a:hover_&_img]:scale-103",
  focus: "motion-safe:[a:focus-visible_&_img]:scale-103",
});

// Images that contain text (posters, flyers, certificates) must keep their own title readable: crop from the top,
// or show the whole image on `muted`. Photos fill the frame.
const twMediaFit = defineStyles({
  cover: {
    geometry: "[&_img]:object-cover",
  },
  top: {
    geometry: "[&_img]:object-cover [&_img]:object-top",
  },
  contain: {
    geometry: "[&_img]:object-contain",
  },
});

/*===== Class Composition =====*/

const cardVariants = cva(joinStyles(twCardStyles), {
  variants: {
    size: composeStyles(twSize),
  },
  defaultVariants: { size: "default" },
});

const cardMediaVariants = cva(joinStyles(twMediaStyles), {
  variants: {
    fit: composeStyles(twMediaFit),
  },
  defaultVariants: { fit: "cover" },
});

const cardHeaderClasses = joinStyles(twHeaderStyles);
const cardTitleClasses = joinStyles(twTitleStyles);
const cardDescriptionClasses = joinStyles(twDescriptionStyles);
const cardActionClasses = joinStyles(twActionStyles);
const cardContentClasses = joinStyles(twContentStyles);
const cardFooterClasses = joinStyles(twFooterStyles);

export {
  cardVariants,
  cardMediaVariants,
  cardHeaderClasses,
  cardTitleClasses,
  cardDescriptionClasses,
  cardActionClasses,
  cardContentClasses,
  cardFooterClasses,
  twSize,
  twMediaFit,
};
