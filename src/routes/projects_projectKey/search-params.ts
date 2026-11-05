import { z } from "zod";

import { SEARCH_QUERY_MAX_LENGTH } from "#/orpc/search/constants";
import { TASK_PRIORITIES } from "#/orpc/task/constants";

/*===== Board Search Params =====*/
// `task` is the open card, by its code (`?task=TD-42`), so a card has a link someone can paste in chat. `cancelled`
// shows the cancelled column, so stopped tasks can be found and reopened. `hide` lists the ids of the columns the
// person took off the board; an id no longer on the board is ignored. The rest filter the cards
// (`board-filter.ts`), so a filtered board can be linked. An invalid value is dropped rather than breaking the page.

/** "Due" filters: past due, due from today through the end of the team's week, or with no due date. */
export const DUE_FILTERS = ["overdue", "week", "none"] as const;

export type DueFilter = (typeof DUE_FILTERS)[number];

/** "Assigned to" beyond a person's id: the one looking, or nobody. */
export const ASSIGNEE_ME = "me";
export const ASSIGNEE_NOBODY = "none";

export const boardSearchSchema = z.object({
  task: z
    .string()
    .regex(/^[A-Za-z]{2,5}-\d{1,9}$/)
    .optional()
    .catch(undefined),
  cancelled: z.boolean().optional().catch(undefined),
  hide: z.array(z.string().max(64)).max(50).optional().catch(undefined),
  /** The header's search text, while it filters this board. */
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH).optional().catch(undefined),
  /** `me`, `none`, or a person's id. */
  assignee: z.string().max(64).optional().catch(undefined),
  /** A label's id. */
  label: z.string().max(64).optional().catch(undefined),
  priority: z.enum(TASK_PRIORITIES).optional().catch(undefined),
  due: z.enum(DUE_FILTERS).optional().catch(undefined),
  blocked: z.boolean().optional().catch(undefined),
});

export type BoardSearch = z.infer<typeof boardSearchSchema>;

/** The task number in a code (`TD-42` → 42). */
export function taskNumberOf(code: string): number {
  return Number(code.slice(code.lastIndexOf("-") + 1));
}
