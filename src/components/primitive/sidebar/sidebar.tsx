import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { type ComponentProps, createContext, type CSSProperties, useContext, useEffect, useState } from "react";

import { useIsMobile } from "#/hooks/use-mobile";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

import { Button } from "../button/button";
import { Input } from "../input/input";
import { Separator } from "../separator/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet/sheet";
import { Skeleton } from "../skeleton/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip/tooltip";
import {
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
} from "./sidebar.styles";

/*===== Constants =====*/

// Two filter keys abreast, each with its LED, its value and its arrow.
const SIDEBAR_WIDTH = "17rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
// Matched by the key's place on the keyboard, so it is the same key on a Persian layout (where it types «ذ»).
const SIDEBAR_KEYBOARD_SHORTCUT = "KeyB";

/*===== Context =====*/

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

/*===== Provider =====*/

/**
 * Holds whether the sidebar is open, for it and for the keys that fold it, which may sit anywhere inside the provider.
 * `open` and `onOpenChange` hand that state to the caller, who keeps it where they like:
 * unlike shadcn's, this provider writes no cookie, since nothing here reads one on the server.
 */
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  /*------ State ------*/
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (setOpenProp) setOpenProp(value);
    else setInternalOpen(value);
  };
  const toggleSidebar = () => (isMobile ? setOpenMobile(!openMobile) : setOpen(!open));

  return (
    <SidebarContext.Provider
      value={{
        state: open ? "expanded" : "collapsed",
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }}
    >
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as CSSProperties
        }
        className={cn(sidebarWrapperClasses, className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/*===== Sidebar =====*/

/**
 * The panel itself. It stands in the page beside `SidebarInset` rather than fixed to the window, stays in view down a
 * long page, and turns into a sheet on a phone. `side` is logical, like a sheet's: `start` and `end` follow the reading
 * direction. Other props land on the element that holds the content, so an `id` there is what a key's `aria-controls`
 * names. Ctrl or Cmd and B folds it, only while one is on the page.
 */
function Sidebar({
  side = "start",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: Omit<ComponentProps<"aside">, "ref"> & {
  side?: "start" | "end";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile, toggleSidebar } = useSidebar();

  /*------ Shortcut ------*/
  // Here and not in the provider, which outlives the sidebar. An editor that took the keys for bold has already handled
  // them, so they don't fold the sidebar as well.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== SIDEBAR_KEYBOARD_SHORTCUT || !(event.metaKey || event.ctrlKey)) return;
      if (event.defaultPrevented) return;
      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  /*------ Not Folding ------*/
  if (collapsible === "none") {
    return (
      <aside data-slot="sidebar" className={cn(sidebarStaticClasses, className)} {...props}>
        {children}
      </aside>
    );
  }

  /*------ Phone ------*/
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className={cn(sidebarSheetClasses, className)}
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as CSSProperties}
          side={side}
          showCloseButton={false}
          {...props}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{m.common_sidebar()}</SheetTitle>
            <SheetDescription>{m.common_sidebar_description()}</SheetDescription>
          </SheetHeader>
          <div className={sidebarSheetInnerClasses}>{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  /*------ Desktop ------*/
  return (
    <div
      className={sidebarRootClasses}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div data-slot="sidebar-gap" className={sidebarGapVariants({ variant })} />
      <aside
        data-slot="sidebar-container"
        data-side={side}
        className={cn(sidebarContainerVariants({ variant }), className)}
        {...props}
      >
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className={sidebarInnerClasses}>
          {children}
        </div>
      </aside>
    </div>
  );
}

/*===== Controls =====*/

/** A key that folds the sidebar and brings it back. Its legend is a panel icon unless it is given its own. */
function SidebarTrigger({ className, onClick, children, ...props }: ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {children ?? (
        <>
          <PanelLeftIcon className="rtl:rotate-180" />
          <span className="sr-only">{m.common_sidebar_toggle()}</span>
        </>
      )}
    </Button>
  );
}

function SidebarRail({ className, ...props }: ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={m.common_sidebar_toggle()}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={m.common_sidebar_toggle()}
      className={cn(sidebarRailClasses, className)}
      {...props}
    />
  );
}

/** What stands beside the sidebar. A `<main>` unless `render` says otherwise: inside a page that has one, give it a `div`. */
function SidebarInset({ className, render, ...props }: useRender.ComponentProps<"main"> & ComponentProps<"main">) {
  return useRender({
    defaultTagName: "main",
    props: mergeProps<"main">({ className: cn(sidebarInsetClasses, className) }, props),
    render,
    state: { slot: "sidebar-inset" },
  });
}

function SidebarInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input data-slot="sidebar-input" data-sidebar="input" className={cn("w-full", className)} {...props} />;
}

/*===== Sections =====*/

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-header" data-sidebar="header" className={cn(sidebarHeaderClasses, className)} {...props} />
  );
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-footer" data-sidebar="footer" className={cn(sidebarFooterClasses, className)} {...props} />
  );
}

function SidebarSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn(sidebarSeparatorClasses, className)}
      {...props}
    />
  );
}

/** The scrolling body. `folding` is for content with no icons: it fades away as the sidebar shrinks to its strip. */
function SidebarContent({ className, folding = false, ...props }: ComponentProps<"div"> & { folding?: boolean }) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(sidebarContentClasses, folding && sidebarContentFoldingClasses, className)}
      {...props}
    />
  );
}

/** What only the open sidebar shows, such as a long name. It stays in the page for screen readers. */
function SidebarExpanded({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-expanded" className={cn(sidebarExpandedClasses, className)} {...props}>
      <div className={sidebarExpandedInnerClasses}>{children}</div>
    </div>
  );
}

function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group" data-sidebar="group" className={cn(sidebarGroupClasses, className)} {...props} />
  );
}

function SidebarGroupLabel({ className, render, ...props }: useRender.ComponentProps<"div"> & ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ className: cn(sidebarGroupLabelClasses, className) }, props),
    render,
    state: { slot: "sidebar-group-label", sidebar: "group-label" },
  });
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ className: cn(sidebarGroupActionClasses, className) }, props),
    render,
    state: { slot: "sidebar-group-action", sidebar: "group-action" },
  });
}

function SidebarGroupContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn(sidebarGroupContentClasses, className)}
      {...props}
    />
  );
}

/*===== Menu =====*/

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn(sidebarMenuClasses, className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn(sidebarMenuItemClasses, className)}
      {...props}
    />
  );
}

/** A key in the menu. `render` makes it a link; a router link that marks its own page latches without `isActive`. */
function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar();
  const button = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ className: cn(sidebarMenuButtonVariants({ variant, size }), className) }, props),
    render: tooltip ? <TooltipTrigger render={render} /> : render,
    state: { slot: "sidebar-menu-button", sidebar: "menu-button", size, active: isActive },
  });

  if (!tooltip) return button;

  return (
    <Tooltip>
      {button}
      <TooltipContent
        side="inline-end"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...(typeof tooltip === "string" ? { children: tooltip } : tooltip)}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      { className: cn(sidebarMenuActionClasses, showOnHover && sidebarMenuActionHoverClasses, className) },
      props,
    ),
    render,
    state: { slot: "sidebar-menu-action", sidebar: "menu-action" },
  });
}

function SidebarMenuBadge({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(sidebarMenuBadgeClasses, className)}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // A width between 50 and 90%, so a loading list doesn't read as a block.
  const [width] = useState(() => `${Math.floor(Math.random() * 40) + 50}%`);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(sidebarMenuSkeletonClasses, className)}
      {...props}
    >
      {showIcon && <Skeleton className={sidebarMenuSkeletonIconClasses} data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className={sidebarMenuSkeletonTextClasses}
        data-sidebar="menu-skeleton-text"
        style={{ "--skeleton-width": width } as CSSProperties}
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(sidebarMenuSubClasses, className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(sidebarMenuSubItemClasses, className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">({ className: cn(sidebarMenuSubButtonClasses, className) }, props),
    render,
    state: { slot: "sidebar-menu-sub-button", sidebar: "menu-sub-button", size, active: isActive },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarExpanded,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
