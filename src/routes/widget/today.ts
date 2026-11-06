import { daysBetween } from "#/lib/team-day";
import type { Notification } from "#/orpc/notification/contract";
import type { MyTask } from "#/orpc/task/contract";

/*===== Today =====*/

/** The widget's "today": work under way, and anything due today or overdue on the team's clock. */
export function isToday({ task, today }: { task: MyTask; today: string }): boolean {
  if (task.columnKind === "doing") return true;
  return task.dueDate !== null && daysBetween({ from: today, to: task.dueDate }) <= 0;
}

/**
 * The notifications worth listing beside today's tasks: a due-date alert about a task already under Today says the same
 * thing twice, so it stays out. It still rings when it arrives (`useArrivals`), and the bell on the site keeps it.
 */
export function withoutRepeats({ items, today }: { items: Notification[]; today: MyTask[] }): Notification[] {
  const listed = new Set(today.map((task) => task.id));
  return items.filter(
    (item) => !((item.kind === "overdue" || item.kind === "due_soon") && item.taskId && listed.has(item.taskId)),
  );
}
