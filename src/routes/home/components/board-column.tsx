import { useId, type ReactNode } from "react";

import { Marking } from "#/components/primitive/marking/marking";
import { formatNumber } from "#/lib/locale";
import { m } from "#/paraglide/messages";

/*===== Board Column =====*/

/**
 * One column of the board: its name printed over a heavy rule, the card count in the instrument mono, and the cards
 * below. With no cards it shows an empty bay, so the column keeps its shape and still reads as a place to drop work.
 */
export function BoardColumn({ title, count, children }: { title: string; count: number; children?: ReactNode }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex min-w-56 flex-1 flex-col gap-3">
      {/*------ Header ------*/}
      <header className="flex items-center justify-between gap-3 border-b-2 border-foreground pb-2">
        <h2 id={headingId} className="font-heading text-h4">
          {title}
        </h2>
        {/* The empty bay or the card list says the same to a screen reader, so the readout is only printed */}
        <Marking variant="code" aria-hidden="true">
          {formatNumber(count, { minimumIntegerDigits: 2 })}
        </Marking>
      </header>

      {/*------ Cards ------*/}
      {count > 0 ? (
        children
      ) : (
        <p className="flex min-h-32 items-center justify-center rounded-chassis border border-dashed border-border">
          <Marking>{m.board_column_empty()}</Marking>
        </p>
      )}
    </section>
  );
}
