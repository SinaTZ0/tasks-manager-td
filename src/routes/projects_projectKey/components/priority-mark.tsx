import { Led } from "#/components/primitive/led/led";
import { ledBezelClasses } from "#/components/primitive/led/led.styles";
import { priorityName } from "#/lib/priority-name";
import { cn } from "#/lib/utils";
import { TASK_PRIORITIES, type TaskPriority } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Priority Mark =====*/

/**
 * A priority as a four-cell LED meter in a black bezel: one lit cell for low, four for urgent, the way the board's
 * display prints its counts. It fills in the reading direction, and only the urgent cell is orange. The count of lit
 * cells carries the level, so the scale reads without colour; the printed name is there for screen readers. Mounted
 * on a housing's top edge, standing proud of it like indicators set into a chassis: the parent must be `relative`.
 */
export function PriorityMark({ priority }: { priority: TaskPriority }) {
  const level = TASK_PRIORITIES.indexOf(priority);

  return (
    <span className={cn("absolute end-3.25 -top-0.5", ledBezelClasses)}>
      <span className="sr-only">{m.priority_readout({ priority: priorityName(priority) })}</span>
      {TASK_PRIORITIES.map((step, index) => (
        <Led
          key={step}
          signal={step === "urgent" ? "action" : "glass"}
          size="bar"
          state={index <= level ? "on" : "off"}
        />
      ))}
    </span>
  );
}
