/*===== Search Limits =====*/
/** The longest search text; longer input is cut, not refused. */
export const SEARCH_QUERY_MAX_LENGTH = 100;

/** At most this many tasks come back, the best first: enough to find one at a team's size. */
export const SEARCH_RESULT_LIMIT = 50;

/** Where a result's words were found. */
export const SEARCH_MATCHES = ["code", "title", "description", "comment"] as const;

export type SearchMatch = (typeof SEARCH_MATCHES)[number];
