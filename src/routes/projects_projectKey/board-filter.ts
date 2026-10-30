import type { TaskCard } from "#/orpc/task/contract";
import { teamWeekEnd } from "#/lib/team-day";
import { ASSIGNEE_ME, ASSIGNEE_NOBODY, type BoardSearch } from "#/routes/projects_projectKey/search-params";

/*===== Board Filter =====*/
// The board already holds every live card, so its filters run in the browser, from the URL (`search-params.ts`).

export type BoardFilter = Pick<BoardSearch, "assignee" | "label" | "priority" | "due" | "blocked">;

/** The filter keys, in the order the filter bar shows them; clearing sets them all to `undefined`. */
export const BOARD_FILTER_KEYS = [
  "assignee",
  "label",
  "priority",
  "due",
  "blocked",
] as const satisfies readonly (keyof BoardFilter)[];

/** Whether any filter is set. */
export function isFiltering(filter: BoardFilter): boolean {
  return BOARD_FILTER_KEYS.some((key) => filter[key] !== undefined);
}

/**
 * A test for the cards a filter keeps; every set filter must hold. Due dates are compared with the team's today
 * (`src/lib/team-day.ts`): overdue is before today, "this week" is today through the week's Friday.
 */
export function cardFilter({
  filter,
  viewerId,
  today,
  isBlocked,
}: {
  filter: BoardFilter;
  viewerId: string;
  today: string;
  isBlocked: (task: TaskCard) => boolean;
}): (task: TaskCard) => boolean {
  const assignee = filter.assignee === ASSIGNEE_ME ? viewerId : filter.assignee;
  const weekEnd = teamWeekEnd(today);
  return (task) => {
    if (assignee === ASSIGNEE_NOBODY ? task.assigneeId !== null : assignee && task.assigneeId !== assignee)
      return false;
    if (filter.label && !task.labelIds.includes(filter.label)) return false;
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.due === "none" && task.dueDate !== null) return false;
    if (filter.due === "overdue" && !(task.dueDate && task.dueDate < today)) return false;
    if (filter.due === "week" && !(task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd)) return false;
    if (filter.blocked && !isBlocked(task)) return false;
    return true;
  };
}
