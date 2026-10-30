import { cn } from "#/lib/utils";
import { TASK_PRIORITIES, type TaskPriority } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import { priorityName } from "#/routes/projects_projectKey/task-text";

/*===== Priority Mark =====*/

// Rising bar heights make the scale readable without colour.
const BAR_HEIGHTS = ["h-1.5", "h-2", "h-2.5", "h-3"] as const;

/**
 * A priority as a four-step level meter: one lit bar for low, four for urgent. Urgent lights its bars orange (the
 * action signal), so it stands apart from ordinary high priority without a new colour.
 */
export function PriorityMark({ priority }: { priority: TaskPriority }) {
  const lit = TASK_PRIORITIES.indexOf(priority) + 1;

  return (
    <span dir="ltr" className="inline-flex items-end gap-0.5">
      <span className="sr-only">{m.priority_readout({ priority: priorityName(priority) })}</span>
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          aria-hidden="true"
          className={cn(
            "w-1 rounded-xs",
            height,
            index >= lit ? "bg-signal-off" : priority === "urgent" ? "bg-signal-action" : "bg-foreground",
          )}
        />
      ))}
    </span>
  );
}
