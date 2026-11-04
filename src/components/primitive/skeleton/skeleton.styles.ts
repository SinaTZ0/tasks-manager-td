import { defineStyles, joinStyles } from "../styles";

/*===== Skeleton =====*/

const twSkeletonStyles = defineStyles({
  geometry: "rounded-chassis-compact",
  appearance: "bg-muted",
  interaction: "animate-pulse",
});

export const skeletonClasses = joinStyles(twSkeletonStyles);
