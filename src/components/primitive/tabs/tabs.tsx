import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { type VariantProps } from "class-variance-authority";
import { createContext, use } from "react";
import { cn } from "#/lib/utils";
import { Led } from "../led/led";
import {
  tabsClasses,
  tabsContentClasses,
  tabsIndicatorClasses,
  tabsListVariants,
  tabsTriggerVariants,
} from "./tabs.styles";

/*===== Tabs =====*/

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(tabsClasses, className)}
      {...props}
    />
  );
}

/*===== Compound Parts =====*/

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

// The list's variant decides whether its triggers are keycaps or printed legends. A context carries it, because the
// keycap recipe paints pseudo-elements that can't be switched on and off from an ancestor's data attribute alone.
const TabsVariantContext = createContext<TabsVariant>("default");

export type TabsListProps = TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>;

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  const resolvedVariant = variant ?? "default";

  return (
    <TabsVariantContext value={resolvedVariant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        className={cn(tabsListVariants({ variant: resolvedVariant }), className)}
        {...props}
      />
    </TabsVariantContext>
  );
}

/**
 * A tab as a key in the list's cut. The active tab stays sunk and lights a selection LED, so the current tab reads by
 * position and light, not colour alone.
 */
function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  const variant = use(TabsVariantContext);

  return (
    <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn(tabsTriggerVariants({ variant }), className)} {...props}>
      <Led signal="selection" state="off" size="sm" className={tabsIndicatorClasses} />
      {children}
    </TabsPrimitive.Tab>
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn(tabsContentClasses, className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
