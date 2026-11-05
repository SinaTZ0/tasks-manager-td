import { cva } from "class-variance-authority";

import { cn } from "#/lib/utils";

import { slotKeyClasses } from "../button/button.styles";
import { markingClasses, slotClasses, twKeycapTone } from "../instrument.styles";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Provider =====*/

const twWrapperStyles = defineStyles({
  layout: "group/sidebar-wrapper flex w-full",
  geometry: "min-h-svh",
  appearance: "has-data-[variant=inset]:bg-sidebar",
});

/*===== Sidebar =====*/

// A sidebar with nothing to fold, sized by its parent.
const twStaticStyles = defineStyles({
  layout: "flex flex-col",
  geometry: "h-full w-(--sidebar-width)",
  appearance: "bg-sidebar surface-grain text-sidebar-foreground",
});

const twSheetStyles = defineStyles({
  geometry: "w-(--sidebar-width) p-0",
  appearance: "bg-sidebar surface-grain text-sidebar-foreground",
});

const twSheetInnerStyles = defineStyles({ layout: "flex size-full flex-col" });

// shadcn's sidebar is `fixed` to the window, for an app that is all shell. Here the header scrolls away, so the sidebar
// stands in the page below it: `root` takes its place in the row, `gap` holds that place open (and is what narrows),
// `container` fills it from top to bottom, and `inner` stays in view inside it.
const twRootStyles = defineStyles({
  layout: "group peer relative hidden flex-none md:block",
  appearance: "text-sidebar-foreground",
});

const twGapStyles = defineStyles({
  layout: "relative",
  geometry: "w-(--sidebar-width)",
  interaction: "transition-[width] duration-240 ease-in-out",
  state: "group-data-[collapsible=offcanvas]:w-0",
});

const twGapVariant = defineStyles({
  sidebar: { state: "sidebar-icon:w-(--sidebar-width-icon)" },
  floating: { state: "sidebar-icon:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" },
  inset: { state: "sidebar-icon:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" },
});

// Folded, it slides past the window's edge as the gap closes, so its end stays on the content's start. It then turns
// invisible, so its keys leave the tab order (visibility holds until the transition ends).
const twContainerStyles = defineStyles({
  layout: "absolute inset-y-0 hidden md:flex",
  geometry: "w-(--sidebar-width)",
  interaction: "transition-[inset-inline-start,inset-inline-end,width,visibility] duration-240 ease-in-out",
  state:
    "group-data-[collapsible=offcanvas]:invisible data-[side=end]:inset-e-0 data-[side=end]:group-data-[collapsible=offcanvas]:-inset-e-(--sidebar-width) data-[side=start]:inset-s-0 data-[side=start]:group-data-[collapsible=offcanvas]:-inset-s-(--sidebar-width)",
});

// `sidebar` is a housing flush with the page's edge, painted on the container so it runs the page's whole height
// while `inner` stays in view; `floating` and `inset` stand clear of it.
const twContainerVariant = defineStyles({
  sidebar: {
    geometry: "data-[side=end]:border-s data-[side=start]:border-e sidebar-icon:w-(--sidebar-width-icon)",
    // The ink is set here as well as on the root: a class that rescopes the tokens (`dark`) lands on this element, and
    // inherited ink from above it would still be the page's.
    appearance: "border-sidebar-border bg-sidebar surface-grain text-sidebar-foreground",
  },
  floating: { geometry: "p-2 sidebar-icon:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" },
  inset: { geometry: "p-2 sidebar-icon:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" },
});

// As tall as the window below the header, so the first screen shows it whole, and never past the page's end. The
// header's height is only an estimate once it wraps on a narrow window; what no longer fits scrolls with the page.
const twInnerStyles = defineStyles({
  layout: "sticky top-0 flex flex-col overflow-hidden",
  geometry: "h-[calc(100svh-var(--header-height))] max-h-full w-full",
  geometryFloating: "group-data-[variant=floating]:rounded-housing group-data-[variant=floating]:border",
  appearanceFloating:
    "group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:bg-sidebar group-data-[variant=floating]:surface-grain group-data-[variant=floating]:shadow-housing",
});

/*===== Controls =====*/

// The strip along the sidebar's edge that folds it when clicked.
const twRailStyles = defineStyles({
  layout:
    "absolute inset-y-0 z-20 hidden group-data-[side=end]:inset-s-0 group-data-[side=start]:-inset-e-4 after:absolute after:inset-y-0 after:inset-s-1/2 sm:flex ltr:-translate-x-1/2 rtl:translate-x-1/2",
  geometry: "w-4 after:w-0.5",
  interaction:
    "transition-all ease-linear in-data-[side=end]:cursor-e-resize in-data-[side=start]:cursor-w-resize rtl:in-data-[side=end]:cursor-w-resize rtl:in-data-[side=start]:cursor-e-resize",
  hover: "hover:after:bg-sidebar-border",
  state:
    "[[data-side=end][data-collapsible=offcanvas]_&]:-inset-s-2 [[data-side=end][data-state=collapsed]_&]:cursor-w-resize rtl:[[data-side=end][data-state=collapsed]_&]:cursor-e-resize [[data-side=start][data-collapsible=offcanvas]_&]:-inset-e-2 [[data-side=start][data-state=collapsed]_&]:cursor-e-resize rtl:[[data-side=start][data-state=collapsed]_&]:cursor-w-resize",
  stateFolded:
    "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:inset-s-full hover:group-data-[collapsible=offcanvas]:bg-sidebar rtl:group-data-[collapsible=offcanvas]:translate-x-0",
});

const twInsetStyles = defineStyles({
  layout: "relative flex w-full min-w-0 flex-1 flex-col",
  appearance: "bg-background",
  state:
    "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-housing md:peer-data-[variant=inset]:shadow-housing md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2",
});

/*===== Sections =====*/

// Header and footer are printed strips ruled off from the body, like a sheet's. Everything between them scrolls.
const twHeaderStyles = defineStyles({
  layout: "flex flex-col gap-3.5",
  geometry: "border-b p-4 sidebar-icon:px-1",
  appearance: "border-sidebar-border",
  interaction: "transition-[padding] duration-240 ease-in-out",
});

const twFooterStyles = defineStyles({
  layout: "flex flex-col gap-3.5",
  geometry: "border-t p-4 sidebar-icon:px-1",
  appearance: "border-sidebar-border",
  interaction: "transition-[padding] duration-240 ease-in-out",
});

// What only the open sidebar shows, closing its height and fading as the sidebar shrinks. Its text stays on one line,
// so it is cut and not rewrapped on the way.
const twExpandedStyles = defineStyles({
  layout: "grid grid-rows-[1fr] sidebar-icon:grid-rows-[0fr]",
  interaction: "transition-[grid-template-rows,opacity] duration-240 ease-in-out",
  state: "sidebar-icon:opacity-0",
});

const twExpandedInnerStyles = defineStyles({ layout: "min-h-0 overflow-hidden", typography: "whitespace-nowrap" });

const twSeparatorStyles = defineStyles({ geometry: "mx-4 w-auto", appearance: "bg-sidebar-border" });

// A thin scrollbar, not shadcn's hidden one: on a short window the keys below the fold have to show they are there.
const twContentStyles = defineStyles({
  layout: "flex min-h-0 flex-1 flex-col gap-1",
  geometry: "py-2.5",
  interaction: "scrollbar-thin overflow-auto sidebar-icon:overflow-hidden",
});

// Content with no icon to shrink to: it keeps its width (less the room a scrollbar takes) while the sidebar closes over
// it, so its keys don't rewrap on the way, and it fades. Then it turns invisible, which takes its keys out of the tab
// order.
const twContentFoldingStyles = defineStyles({
  geometry: "min-w-[calc(var(--sidebar-width)-(--spacing(3)))]",
  interaction: "transition-[opacity,visibility] duration-240 ease-in-out",
  state: "sidebar-icon:invisible sidebar-icon:opacity-0",
});

// The padding also leaves room for the keys' cuts and focus rings, which sit outside their boxes: the scrolling
// content would clip them against its edge.
const twGroupStyles = defineStyles({
  layout: "relative flex w-full min-w-0 flex-col",
  geometry: "px-4 py-1 sidebar-icon:px-1",
  interaction: "transition-[padding] duration-240 ease-in-out",
});

const twGroupLabelStyles = defineStyles({
  layout: "flex shrink-0 items-center",
  geometry: "h-6 sidebar-icon:-mt-6",
  typography: markingClasses,
  interaction: "transition-[margin,opacity] duration-200 ease-in-out outline-none",
  state: "sidebar-icon:opacity-0",
  focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  icon: "[&>svg]:size-3.5 [&>svg]:shrink-0",
});

// A small printed key, with no cut: it rides on top of a row of keys.
const twSmallKeyStyles = defineStyles({
  layout: "absolute flex aspect-square items-center justify-center after:absolute after:-inset-2 md:after:hidden",
  geometry: "w-5 rounded-keycap-compact p-0",
  appearance: "text-sidebar-foreground",
  interaction: "outline-none",
  hover: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  state: "sidebar-icon:hidden",
  icon: "[&>svg]:size-3.5 [&>svg]:shrink-0",
});

const twGroupActionStyles = defineStyles({ layout: "inset-e-4 top-2" });

const twGroupContentStyles = defineStyles({ geometry: "w-full", typography: "text-body-sm" });

/*===== Menu =====*/

// A menu is one slot running down the sidebar, its buttons the keys inside it, like the header's navigation lying on
// its side. A menu button latches on the current page (`aria-current="page"`, or `isActive`).
const sidebarMenuClasses = cn(slotClasses, "flex w-full min-w-0 flex-col");

const twMenuItemStyles = defineStyles({ layout: "group/menu-item relative flex min-w-0" });

const twMenuButtonStyles = defineStyles({
  layout: "peer/menu-button group/menu-button w-full min-w-0 justify-start",
  geometry: "group-has-data-[sidebar=menu-action]/menu-item:pe-8",
  // In the strip the key is as wide as the slot and just holds its icon: the label is cut off, and stays for readers.
  geometryIcon: "sidebar-icon:px-2",
  typography: "text-start",
  interaction: "overflow-hidden transition-[padding] duration-240 ease-in-out",
  icon: "[&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
});

const twMenuButtonVariant = defineStyles({
  default: {},
  // The orange key: the page's main action, one per view.
  highlight: {
    appearance: cn(joinStyles(twKeycapTone.highlight), "after:shadow-keycap-highlight-compact"),
  },
  // A blank plate instead of a raised key.
  outline: { appearance: cn(joinStyles(twKeycapTone.flat), "after:shadow-none") },
});

const twMenuButtonSize = defineStyles({
  default: {},
  sm: { geometry: "h-8 px-3", typography: "text-caption font-semibold" },
  lg: { geometry: "h-12" },
});

const sidebarMenuButtonVariants = cva(cn(slotKeyClasses, joinStyles(twMenuButtonStyles)), {
  variants: {
    variant: composeStyles(twMenuButtonVariant),
    size: composeStyles(twMenuButtonSize),
  },
  defaultVariants: { variant: "default", size: "default" },
});

const twMenuActionStyles = defineStyles({
  layout: "inset-e-1 top-2.5 peer-data-[size=lg]/menu-button:top-3.5 peer-data-[size=sm]/menu-button:top-1.5",
  appearance: "text-keycap-foreground",
});

const twMenuActionHover = defineStyles({
  interaction: "md:opacity-0",
  state: "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100",
});

const twMenuBadgeStyles = defineStyles({
  layout:
    "pointer-events-none absolute inset-e-1.5 top-2.5 flex items-center justify-center peer-data-[size=lg]/menu-button:top-3.5 peer-data-[size=sm]/menu-button:top-1.5",
  geometry: "h-5 min-w-5 px-1",
  typography: "font-mono text-caption tabular-nums",
  appearance: "text-keycap-foreground",
  interaction: "select-none",
  state: "sidebar-icon:hidden",
});

const twMenuSkeletonStyles = defineStyles({ layout: "flex items-center gap-2", geometry: "h-8 px-2" });
const twMenuSkeletonIconStyles = defineStyles({ geometry: "size-3.5" });
const twMenuSkeletonTextStyles = defineStyles({ layout: "flex-1", geometry: "h-4 max-w-(--skeleton-width)" });

const twMenuSubStyles = defineStyles({
  layout: "flex min-w-0 flex-col gap-1",
  geometry: "mx-3.5 border-s px-2.5 py-0.5",
  appearance: "border-sidebar-border",
  state: "sidebar-icon:hidden",
});

const twMenuSubItemStyles = defineStyles({ layout: "group/menu-sub-item relative" });

const twMenuSubButtonStyles = defineStyles({
  layout: "flex min-w-0 items-center gap-2 overflow-hidden",
  geometry: "h-7 rounded-keycap-compact px-3",
  typography: "data-[size=md]:text-body-sm data-[size=sm]:text-caption",
  appearance: "text-sidebar-foreground",
  interaction: "outline-none",
  hover: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  active: "active:bg-sidebar-accent active:text-sidebar-accent-foreground",
  disabled:
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
  state: "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground sidebar-icon:hidden",
  icon: "[&>span:last-child]:truncate [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
});

/*===== Class Composition =====*/

const sidebarWrapperClasses = joinStyles(twWrapperStyles);
const sidebarStaticClasses = joinStyles(twStaticStyles);
const sidebarSheetClasses = joinStyles(twSheetStyles);
const sidebarSheetInnerClasses = joinStyles(twSheetInnerStyles);
const sidebarRootClasses = joinStyles(twRootStyles);
const sidebarInnerClasses = joinStyles(twInnerStyles);
const sidebarRailClasses = joinStyles(twRailStyles);
const sidebarInsetClasses = joinStyles(twInsetStyles);
const sidebarHeaderClasses = joinStyles(twHeaderStyles);
const sidebarFooterClasses = joinStyles(twFooterStyles);
const sidebarSeparatorClasses = joinStyles(twSeparatorStyles);
const sidebarContentClasses = joinStyles(twContentStyles);
const sidebarContentFoldingClasses = joinStyles(twContentFoldingStyles);
const sidebarExpandedClasses = joinStyles(twExpandedStyles);
const sidebarExpandedInnerClasses = joinStyles(twExpandedInnerStyles);
const sidebarGroupClasses = joinStyles(twGroupStyles);
const sidebarGroupLabelClasses = joinStyles(twGroupLabelStyles);
const sidebarGroupActionClasses = cn(joinStyles(twSmallKeyStyles), joinStyles(twGroupActionStyles));
const sidebarGroupContentClasses = joinStyles(twGroupContentStyles);
const sidebarMenuItemClasses = joinStyles(twMenuItemStyles);
const sidebarMenuActionClasses = cn(joinStyles(twSmallKeyStyles), joinStyles(twMenuActionStyles));
const sidebarMenuActionHoverClasses = joinStyles(twMenuActionHover);
const sidebarMenuBadgeClasses = joinStyles(twMenuBadgeStyles);
const sidebarMenuSkeletonClasses = joinStyles(twMenuSkeletonStyles);
const sidebarMenuSkeletonIconClasses = joinStyles(twMenuSkeletonIconStyles);
const sidebarMenuSkeletonTextClasses = joinStyles(twMenuSkeletonTextStyles);
const sidebarMenuSubClasses = joinStyles(twMenuSubStyles);
const sidebarMenuSubItemClasses = joinStyles(twMenuSubItemStyles);
const sidebarMenuSubButtonClasses = joinStyles(twMenuSubButtonStyles);

const sidebarGapVariants = cva(joinStyles(twGapStyles), {
  variants: { variant: composeStyles(twGapVariant) },
  defaultVariants: { variant: "sidebar" },
});

const sidebarContainerVariants = cva(joinStyles(twContainerStyles), {
  variants: { variant: composeStyles(twContainerVariant) },
  defaultVariants: { variant: "sidebar" },
});

export {
  sidebarContainerVariants,
  sidebarContentClasses,
  sidebarContentFoldingClasses,
  sidebarExpandedClasses,
  sidebarExpandedInnerClasses,
  sidebarFooterClasses,
  sidebarGapVariants,
  sidebarGroupActionClasses,
  sidebarGroupClasses,
  sidebarGroupContentClasses,
  sidebarGroupLabelClasses,
  sidebarHeaderClasses,
  sidebarInnerClasses,
  sidebarInsetClasses,
  sidebarMenuActionClasses,
  sidebarMenuActionHoverClasses,
  sidebarMenuBadgeClasses,
  sidebarMenuButtonVariants,
  sidebarMenuClasses,
  sidebarMenuItemClasses,
  sidebarMenuSkeletonClasses,
  sidebarMenuSkeletonIconClasses,
  sidebarMenuSkeletonTextClasses,
  sidebarMenuSubButtonClasses,
  sidebarMenuSubClasses,
  sidebarMenuSubItemClasses,
  sidebarRailClasses,
  sidebarRootClasses,
  sidebarSeparatorClasses,
  sidebarSheetClasses,
  sidebarSheetInnerClasses,
  sidebarStaticClasses,
  sidebarWrapperClasses,
  twContainerVariant,
  twMenuButtonSize,
  twMenuButtonVariant,
};
