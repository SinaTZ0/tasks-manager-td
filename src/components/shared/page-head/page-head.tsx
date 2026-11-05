import type { ReactNode } from "react";

/*===== Page Head =====*/

/**
 * A page's name printed on the desk, the way a panel's name is printed above its parts: the title, an optional line of
 * description, and the page's own keys at the end. A rule under it closes the head off from the page.
 *
 * Everything here sits on the desk, not a housing, so it prints in `foreground` (grey text there falls under 4.5:1).
 */
export function PageHead({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Keys that act on the whole page, at its end. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-foreground/25 pb-5">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-heading text-h1">{title}</h1>
        {description && <p className="max-w-prose text-body-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
