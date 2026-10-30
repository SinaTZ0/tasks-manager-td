import { useId, type CSSProperties, type ReactNode, type Ref } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

/*===== Board Column =====*/

/** A count as the column header prints it: two digits, like a readout. */
const pad = (value: number) => formatNumber(value, { minimumIntegerDigits: 2 });

/**
 * One column of the board: its name printed over a heavy rule, the card count in the instrument mono (`count/limit`
 * when it has a WIP limit, with a yellow LED once the count passes it), and the cards below. With no cards it shows an
 * empty bay, so the column keeps its shape and still reads as a place to drop work. The footer (quick add) sits under
 * the cards.
 *
 * On the board a column is also a drop target and, for an admin, something to pick up: `bodyRef` marks the area that
 * takes cards (the empty bay too), `grip` sits before the name, and `ref`, `style` and `dragging` belong to the drag.
 */
export function BoardColumn({
  title,
  count,
  wipLimit,
  footer,
  children,
  ref,
  bodyRef,
  style,
  grip,
  dragging = false,
}: {
  title: string;
  count: number;
  wipLimit: number | null;
  /** Below the cards: the quick-add field. */
  footer?: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
  bodyRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  grip?: ReactNode;
  dragging?: boolean;
}) {
  const headingId = useId();
  const overLimit = wipLimit !== null && count > wipLimit;

  return (
    <section
      ref={ref}
      style={style}
      aria-labelledby={headingId}
      className={cn("flex min-w-64 flex-1 drag-motion flex-col gap-3", dragging && "z-10 opacity-70")}
    >
      {/*------ Header ------*/}
      <header className="flex items-center justify-between gap-3 border-b-2 border-foreground pb-2">
        <span className="flex items-center gap-2">
          {grip}
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
      <div ref={bodyRef}>
        {count > 0 ? (
          children
        ) : (
          <p className="flex min-h-32 items-center justify-center rounded-chassis border border-dashed border-border">
            <Marking>{m.board_column_empty()}</Marking>
          </p>
        )}
      </div>
      {footer}
    </section>
  );
}
