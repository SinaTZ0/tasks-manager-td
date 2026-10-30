import { cn } from "#/lib/utils";
import type { Label } from "#/orpc/task/contract";
import { LABEL_SWATCH } from "#/routes/projects_projectKey/task-text";

/*===== Label Tag =====*/

/** A label as a strip from a label maker: its name printed beside a small square swatch of its colour. */
export function LabelTag({ label }: { label: Label }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-chassis border border-border px-2 font-heading text-marking font-semibold text-muted-foreground">
      <span aria-hidden="true" className={cn("size-2 rounded-xs", LABEL_SWATCH[label.color])} />
      {label.name}
    </span>
  );
}
