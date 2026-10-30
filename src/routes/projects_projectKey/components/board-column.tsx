import { useId, type ReactNode } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { formatNumber } from "#/lib/locale";
import { m } from "#/paraglide/messages";

/*===== Board Column =====*/

/** A count as the column header prints it: two digits, like a readout. */
const pad = (value: number) => formatNumber(value, { minimumIntegerDigits: 2 });

/**
 * One column of the board: its name printed over a heavy rule, the card count in the instrument mono (`count/limit`
 * when it has a WIP limit, with a yellow LED once the count passes it), and the cards below. With no cards it shows an
 * empty bay, so the column keeps its shape and still reads as a place to drop work. The footer (quick add) sits under
 * the cards.
 */
export function BoardColumn({
  title,
  count,
  wipLimit,
  footer,
  children,
}: {
  title: string;
  count: number;
  wipLimit: number | null;
  /** Below the cards: the quick-add field. */
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const headingId = useId();
  const overLimit = wipLimit !== null && count > wipLimit;

  return (
    <section aria-labelledby={headingId} className="flex min-w-64 flex-1 flex-col gap-3">
      {/*------ Header ------*/}
      <header className="flex items-center justify-between gap-3 border-b-2 border-foreground pb-2">
        <h2 id={headingId} className="font-heading text-h4">
          {title}
        </h2>
        <span className="flex items-center gap-2">
          {wipLimit !== null && (
            <Led
              signal="attention"
              state={overLimit ? "on" : "off"}
              label={overLimit ? m.board_over_wip() : undefined}
            />
          )}
          {/* The card list says the count to a screen reader; the limit is spoken with it. */}
          <Marking variant="code" aria-hidden={wipLimit === null || undefined}>
            {wipLimit === null ? (
              pad(count)
            ) : (
              <>
                <bdi dir="ltr" aria-hidden="true">{`${pad(count)}/${pad(wipLimit)}`}</bdi>
                <span className="sr-only">{m.board_wip_readout({ count, limit: wipLimit })}</span>
              </>
            )}
          </Marking>
        </span>
      </header>

      {/*------ Cards ------*/}
      {count > 0 ? (
        children
      ) : (
        <p className="flex min-h-32 items-center justify-center rounded-chassis border border-dashed border-border">
          <Marking>{m.board_column_empty()}</Marking>
        </p>
      )}
      {footer}
    </section>
  );
}
