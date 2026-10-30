import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, stripSearchParams } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useCallback } from "react";

import { Card, CardContent } from "#/components/primitive/card/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/primitive/input-group/input-group";
import { Marking } from "#/components/primitive/marking/marking";
import { useSearchText } from "#/hooks/use-search-text";
import { columnTitle } from "#/lib/column-title";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { SearchMatch } from "#/orpc/search/constants";
import type { SearchResult } from "#/orpc/search/contract";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";
import { searchPageDefaults, searchPageSchema } from "#/routes/search/search-params";

/*===== Route =====*/
const searchQuery = (q: string) => orpc.search.tasks.queryOptions({ input: { q } });

export const Route = createFileRoute("/_site-layout/_app-layout/search")({
  validateSearch: searchPageSchema,
  search: { middlewares: [stripSearchParams(searchPageDefaults)] },
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ context, deps }) => {
    const results = await context.queryClient.ensureQueryData(searchQuery(deps.q));
    // A whole task code (`TGQ-12`) opens that card straight away.
    const [only] = results;
    if (only?.matchedIn === "code") {
      throw redirect({
        to: "/projects/$projectKey",
        params: { projectKey: only.projectKey },
        search: { task: taskCode({ key: only.projectKey, number: only.number }) },
      });
    }
  },
  // Behind a sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.search_title(), index: false }),
  component: SearchPage,
});

/*===== Page =====*/

/**
 * Search across the viewer's projects (docs/task-manager-plan.md → slice 11): task codes, titles, descriptions and
 * comment text, live tasks first; archived ones are marked. Typing here searches again after a pause.
 */
function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: results } = useSuspenseQuery(searchQuery(q));
  const commit = useCallback(
    (next: string) => navigate({ search: (previous) => ({ ...previous, q: next }), replace: true }),
    [navigate],
  );
  const [text, setText] = useSearchText({ value: q, onCommit: commit });

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-h2">{m.search_title()}</h1>
        <p className="text-muted-foreground">{m.search_description()}</p>
      </div>

      <search className="max-w-xl">
        <form onSubmit={(event) => event.preventDefault()}>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={m.search_placeholder()}
              aria-label={m.search_label()}
              autoComplete="off"
            />
          </InputGroup>
        </form>
      </search>

      <Card>
        <CardContent>
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <SearchIcon className="size-8" />
              <p>{q ? m.search_empty({ q }) : m.search_start()}</p>
            </div>
          ) : (
            <>
              {/* Read out when the results change under the field. */}
              <output className="block pb-3 text-body-sm text-muted-foreground">
                {m.search_count({ count: results.length })}
              </output>
              <ul className="flex flex-col striped">
                {results.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*===== Row =====*/
const MATCH_LABELS: Record<SearchMatch, () => string> = {
  code: m.search_match_title,
  title: m.search_match_title,
  description: m.search_match_description,
  comment: m.search_match_comment,
};

/** One task: code and title (opening its card), project and column, and the words that matched outside the title. */
function ResultRow({ result }: { result: SearchResult }) {
  const code = taskCode({ key: result.projectKey, number: result.number });

  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex min-w-0 items-baseline gap-3">
        <Link
          to={result.archived ? "/projects/$projectKey/archive" : "/projects/$projectKey"}
          params={{ projectKey: result.projectKey }}
          search={result.archived ? undefined : { task: code }}
          className="flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Marking variant="code">{code}</Marking>
          <span className="truncate font-semibold">{result.title}</span>
        </Link>
        {result.archived && <Marking>{m.search_archived()}</Marking>}
        <span className="ms-auto shrink-0 text-body-sm text-muted-foreground">
          {result.projectName} · {columnTitle({ kind: result.columnKind, name: result.columnName })}
        </span>
      </div>
      {result.excerpt && (
        <p className="line-clamp-2 text-body-sm">
          <span className="text-muted-foreground">{MATCH_LABELS[result.matchedIn]()}: </span>
          {result.excerpt}
        </p>
      )}
    </li>
  );
}
