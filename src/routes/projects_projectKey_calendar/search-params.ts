import { z } from "zod";

import { boardSearchSchema } from "#/routes/projects_projectKey/search-params";

/*===== Calendar Search Params =====*/
// The board's (the open card, its filters), and `month`: a day in the month shown (`?month=2026-10-23`), this month
// when left out. An invalid value is dropped rather than breaking the page.

export const calendarSearchSchema = boardSearchSchema.omit({ cancelled: true, q: true }).extend({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export type CalendarSearch = z.infer<typeof calendarSearchSchema>;
