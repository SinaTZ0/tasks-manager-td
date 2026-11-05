import type { TaskCard } from "#/orpc/task/contract";
import { matchesSearch, searchWords } from "#/lib/persian-text";
import { teamWeekEnd } from "#/lib/team-day";
import { taskCode } from "#/orpc/task/constants";
import { ASSIGNEE_ME, ASSIGNEE_NOBODY, type BoardSearch } from "#/routes/projects_projectKey/search-params";

/*===== Board Filter =====*/
// The board already holds every live card, so its filters run in the browser, from the URL (`search-params.ts`).

export type BoardFilter = Pick<BoardSearch, "q" | "assignee" | "label" | "priority" | "due" | "blocked">;

/** The filter keys; clearing sets them all to `undefined`. */
export const BOARD_FILTER_KEYS = [
  "q",
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
 * (`src/lib/team-day.ts`): overdue is before today, "this week" is today through the week's Friday. The search text
 * looks in what a card shows, its title and code: descriptions and comments aren't on the board, so those stay with
 * the search page.
 */
export function cardFilter({
  filter,
  projectKey,
  viewerId,
  today,
  isBlocked,
}: {
  filter: BoardFilter;
  projectKey: string;
  viewerId: string;
  today: string;
  isBlocked: (task: TaskCard) => boolean;
}): (task: TaskCard) => boolean {
  const assignee = filter.assignee === ASSIGNEE_ME ? viewerId : filter.assignee;
  const weekEnd = teamWeekEnd(today);
  const words = searchWords(filter.q ?? "");
  return (task) => {
    if (!matchesSearch(words, [task.title, taskCode({ key: projectKey, number: task.number })])) return false;
    if (assignee === ASSIGNEE_NOBODY ? task.assigneeIds.length > 0 : assignee && !task.assigneeIds.includes(assignee))
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
