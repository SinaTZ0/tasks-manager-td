import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent } from "#/components/primitive/card/card";
import { pageMeta } from "#/lib/seo";
import { m } from "#/paraglide/messages";
import { BoardColumn } from "#/routes/home/components/board-column";

/*===== Columns =====*/

// The column kinds a board starts with, in order (docs/app.md → Column). Cancelled cards stay off the board, so the
// cancelled column isn't drawn. Message functions, not their text, so each request gets its own locale.
const COLUMNS = [
  { kind: "backlog", title: m.board_column_backlog },
  { kind: "todo", title: m.board_column_todo },
  { kind: "doing", title: m.board_column_doing },
  { kind: "paused", title: m.board_column_paused },
  { kind: "review", title: m.board_column_review },
  { kind: "done", title: m.board_column_done },
] as const;

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/")({
  // The board is behind sign-in, so it stays out of search results (docs/frontend/seo.md).
  head: (args) => pageMeta({ args, title: m.board_title(), index: false }),
  component: Board,
});

/*===== Board =====*/

/**
 * The team board: every column in one housing, side by side. Until tasks exist the columns are empty bays; the task
 * feature fills them from its query.
 */
function Board() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-h2">{m.board_title()}</h1>

      <Card>
        <CardContent>
          {/* Wider than most screens, so the row scrolls. Browsers make a scrolling box keyboard-focusable themselves,
              so it gets the focus ring but no `tabIndex`. */}
          <section
            aria-label={m.board_columns()}
            className="-m-2 flex gap-6 overflow-x-auto p-2 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {COLUMNS.map((column) => (
              <BoardColumn key={column.kind} title={column.title()} count={0} />
            ))}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
