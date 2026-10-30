import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

import { kbdClasses, kbdGroupClasses } from "./kbd.styles";

/*===== Kbd =====*/

/** A keyboard key legend. Shortcuts are left-to-right in every language, so it is set `dir="ltr"`. */
function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" dir="ltr" className={cn(kbdClasses, className)} {...props} />;
}

function KbdGroup({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" dir="ltr" className={cn(kbdGroupClasses, className)} {...props} />;
}

export { Kbd, KbdGroup };
