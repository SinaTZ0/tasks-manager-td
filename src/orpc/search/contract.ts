import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { SEARCH_MATCHES } from "#/orpc/search/constants";

/*===== Schemas =====*/
/** A task that matched, from a project the viewer is on. */
export const searchResultSchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  projectName: z.string(),
  number: z.number().int(),
  title: z.string(),
  columnKind: z.enum(COLUMN_KINDS),
  /** Null until an admin renames the column: the page prints the kind's own name. */
  columnName: z.string().nullable(),
  archived: z.boolean(),
  /** Where the words were found; `code` is a whole task code (`TGQ-12`), and is the only result. */
  matchedIn: z.enum(SEARCH_MATCHES),
  /** For a description or comment match, the words around the match. */
  excerpt: z.string().nullable(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

/*===== Procedures =====*/
export const searchContract = {
  /**
   * The viewer's projects' tasks whose code, title, description or comments contain the text, live ones first. An
   * admin searches every project.
   */
  tasks: oc
    .errors({ ...commonErrors, ...authErrors })
    .input(z.strictObject({ q: z.string() }))
    .output(z.array(searchResultSchema)),
};
