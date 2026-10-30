import { z } from "zod";

import { SEARCH_QUERY_MAX_LENGTH } from "#/orpc/search/constants";

/*===== Search Page Params =====*/
// `q` is what was searched for, so a search can be linked. The server normalizes it (`searchTasks`).
export const searchPageDefaults = { q: "" } as const;

export const searchPageSchema = z.object({
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).default(searchPageDefaults.q).catch(searchPageDefaults.q),
});
