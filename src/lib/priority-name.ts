import type { TaskPriority } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Priority Names =====*/

// Message functions, not their text, so each request gets its own locale.
const PRIORITY_NAMES: Record<TaskPriority, () => string> = {
  low: m.priority_low,
  medium: m.priority_medium,
  high: m.priority_high,
  urgent: m.priority_urgent,
};

/** A priority's name in the reader's language. */
export function priorityName(priority: TaskPriority): string {
  return PRIORITY_NAMES[priority]();
}
