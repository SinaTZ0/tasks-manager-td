import type { ComponentProps } from "react";

import { cn } from "#/lib/utils";

import { skeletonClasses } from "./skeleton.styles";

/*===== Skeleton =====*/

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn(skeletonClasses, className)} {...props} />;
}

export { Skeleton };
