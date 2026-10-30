import type { ReactNode } from "react";

/*===== Page Head =====*/

/**
 * A page's name printed on the desk, the way a panel's name is printed above its parts: an optional kicker line (a
 * code in the instrument mono and the words after it, e.g. a project's key and name), the title, an optional line of
 * description, and the page's own keys at the end. A rule under it closes the head off from the page.
 *
 * Everything here sits on the desk, not a housing, so it prints in `foreground` (grey text there falls under 4.5:1).
 */
export function PageHead({
  title,
  code,
  kicker,
  description,
  actions,
}: {
  title: ReactNode;
  /** A code printed before the kicker, left to right in every language (a project's key). */
  code?: string;
  kicker?: ReactNode;
  description?: ReactNode;
  /** Keys that act on the whole page, at its end. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-foreground/25 pb-5">
      <div className="flex min-w-0 flex-col gap-1">
        {(code || kicker) && (
          <p className="flex items-center gap-2 font-heading text-marking tracking-marking">
            {code && (
              <bdi dir="ltr" className="font-mono font-medium tracking-readout">
                {code}
              </bdi>
            )}
            {code && kicker && <span aria-hidden="true">/</span>}
            {kicker}
          </p>
        )}
        <h1 className="font-heading text-h1">{title}</h1>
        {description && <p className="max-w-prose text-body-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
