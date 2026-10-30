import { useId, type CSSProperties, type ReactNode, type Ref } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

/*===== Board Column =====*/

/** A count as the column header prints it. Not padded: a Persian zero is a dot, so "۰۲" reads as "·۲". */
const pad = (value: number) => formatNumber(value);

/**
 * One column of the board, as a tray milled into the board's housing that its cards sit in: its name printed at the
 * top, the card count in the instrument mono (`count/limit`
 * when it has a WIP limit, with a yellow LED once the count passes it), and the cards below. With no cards it shows an
 * empty bay, so the column keeps its shape and still reads as a place to drop work. While the board is filtered
 * (`total` set) the count reads "3 of 9", and the limit is checked against all.
 *
 * On the board a column is also a drop target and, for an admin, something to pick up: `bodyRef` marks the area that
 * takes cards (the empty bay too), `grip` sits before the name, and `ref`, `style` and `dragging` belong to the drag.
 * The grip prints only while the pointer is over the column or focus is inside it (always on a touch screen), so a
 * row of columns doesn't read as a row of handles.
 */
export function BoardColumn({
  title,
  count,
  total,
  wipLimit,
  children,
  ref,
  bodyRef,
  style,
  grip,
  dragging = false,
}: {
  title: string;
  /** The cards shown. */
  count: number;
  /** While filtered, the cards the column holds in all; undefined when nothing is filtered. */
  total?: number | undefined;
  wipLimit: number | null;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
  bodyRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  grip?: ReactNode;
  dragging?: boolean;
}) {
  const headingId = useId();
  const overLimit = wipLimit !== null && (total ?? count) > wipLimit;

  return (
    <section
      ref={ref}
      style={style}
      aria-labelledby={headingId}
      className={cn(
        "group/column flex min-w-64 flex-1 drag-motion flex-col gap-2 rounded-housing bg-tray p-2 shadow-tray board-fit:min-w-0 board-wrap:min-w-0",
        dragging && "z-10 opacity-70",
      )}
    >
      {/*------ Header ------*/}
      <header className="flex min-h-9 items-center justify-between gap-3 ps-1 pe-2">
        <span className="flex items-center gap-1.5">
          {grip && (
            <span className="flex opacity-0 transition-opacity group-focus-within/column:opacity-100 group-hover/column:opacity-100 pointer-coarse:opacity-100">
              {grip}
            </span>
          )}
          <h2 id={headingId} className="font-heading text-h4">
            {title}
          </h2>
        </span>
        <span className="flex items-center gap-2">
          {wipLimit !== null && (
            <Led
              signal="attention"
              state={overLimit ? "on" : "off"}
              label={overLimit ? m.board_over_wip() : undefined}
            />
          )}
          {/* The card list says the count to a screen reader; the limit is spoken with it. */}
          {total !== undefined ? (
            <Marking>{m.board_filtered_count({ shown: count, total })}</Marking>
          ) : (
            <Marking variant="reading" aria-hidden={wipLimit === null || undefined}>
              {wipLimit === null ? (
                pad(count)
              ) : (
                <>
                  <bdi dir="ltr" aria-hidden="true">{`${pad(count)}/${pad(wipLimit)}`}</bdi>
                  <span className="sr-only">{m.board_wip_readout({ count, limit: wipLimit })}</span>
                </>
              )}
            </Marking>
          )}
        </span>
      </header>

      {/*------ Cards ------*/}
      <div ref={bodyRef}>
        {count > 0 ? (
          children
        ) : (
          <p className="flex min-h-32 items-center justify-center rounded-chassis border border-dashed border-border/70">
            <Marking>{total ? m.board_column_none_match() : m.board_column_empty()}</Marking>
          </p>
        )}
      </div>
    </section>
  );
}
