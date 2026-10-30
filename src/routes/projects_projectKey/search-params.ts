import { z } from "zod";

/*===== Board Search Params =====*/
// `task` is the open card, by its code (`?task=TD-42`), so a card has a link someone can paste in chat. `cancelled`
// shows the cancelled column, so stopped tasks can be found and reopened. An invalid value is dropped rather than
// breaking the page.
export const boardSearchSchema = z.object({
  task: z
    .string()
    .regex(/^[A-Za-z]{2,5}-\d{1,9}$/)
    .optional()
    .catch(undefined),
  cancelled: z.boolean().optional().catch(undefined),
});

/** The task number in a code (`TD-42` → 42). */
export function taskNumberOf(code: string): number {
  return Number(code.slice(code.lastIndexOf("-") + 1));
}
