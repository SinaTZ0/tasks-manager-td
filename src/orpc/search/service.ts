import type { Database } from "#/db/client.server";
import { toLatinDigits } from "#/lib/digits";
import { normalizePersianText } from "#/lib/persian-text";
import { oneOf } from "#/orpc/allowed-values";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_RESULT_LIMIT, type SearchMatch } from "#/orpc/search/constants";
import type { SearchResult } from "#/orpc/search/contract";
import { findTaskByCode, findTasksContaining, type SearchRow } from "#/orpc/search/repository";

/*===== Search =====*/
/** A whole task code, in either digit set: `TGQ-12`, `tgq-۱۲`. */
const TASK_CODE = /^([A-Za-z]{2,5})-(\d{1,9})$/;

/** How many characters of context an excerpt keeps on each side of the match. */
const EXCERPT_CONTEXT = 60;

/** The words around the first match in `text`, with an ellipsis where it was cut. */
function excerptOf({ text, query }: { text: string; query: string }): string {
  const at = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (at === -1) return text.slice(0, EXCERPT_CONTEXT * 2);
  const start = Math.max(0, at - EXCERPT_CONTEXT);
  const end = Math.min(text.length, at + query.length + EXCERPT_CONTEXT);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function toResult({ row, query, code }: { row: SearchRow; query: string; code?: boolean }): SearchResult {
  const lower = query.toLocaleLowerCase();
  const matchedIn: SearchMatch = code
    ? "code"
    : row.title.toLocaleLowerCase().includes(lower)
      ? "title"
      : row.descriptionText.toLocaleLowerCase().includes(lower)
        ? "description"
        : "comment";
  const source = matchedIn === "description" ? row.descriptionText : matchedIn === "comment" ? row.commentText : null;
  return {
    id: row.id,
    projectKey: row.projectKey,
    projectName: row.projectName,
    number: row.number,
    title: row.title,
    columnKind: oneOf({ allowed: COLUMN_KINDS, value: row.columnKind, what: "column kind" }),
    columnName: row.columnName,
    archived: row.archivedAt !== null,
    matchedIn,
    excerpt: source ? excerptOf({ text: source, query }) : null,
  };
}

/**
 * Searches the tasks of the projects a person can open (docs/task-manager-plan.md → slice 11). A whole task code
 * (`TGQ-12`) finds just that task, so the page can open it; anything else is looked for in titles, descriptions and
 * comments, normalized the way stored text is. Empty text finds nothing.
 */
export async function searchTasks({
  db,
  user,
  q,
}: {
  db: Database;
  user: { id: string; role?: string | null | undefined };
  q: string;
}): Promise<SearchResult[]> {
  const query = normalizePersianText(q).slice(0, SEARCH_QUERY_MAX_LENGTH);
  if (!query) return [];
  const access = { db, userId: user.id, admin: user.role === "admin" };

  const code = TASK_CODE.exec(toLatinDigits(query));
  if (code?.[1] && code[2]) {
    const row = await findTaskByCode({ ...access, key: code[1].toUpperCase(), number: Number(code[2]) });
    if (row) return [toResult({ row, query, code: true })];
  }

  const rows = await findTasksContaining({ ...access, text: query, limit: SEARCH_RESULT_LIMIT });
  return rows.map((row) => toResult({ row, query }));
}
