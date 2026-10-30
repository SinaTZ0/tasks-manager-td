import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';
import { codeMarkingClassName, markingClassName } from './instrument.recipes';

/*===== Types =====*/

type ModulePanelProps = {
  /** Printed module name in the header strip. */
  marking: string;
  /** Serial printed at the header's end, e.g. `M / 03`. */
  serial?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shows the four corner screws; reserve for top-level modules so they keep meaning "fixed part". */
  fastened?: boolean;
  className?: string;
};

/*===== Constants =====*/

const fastenerPositions = ['top-2 start-2', 'top-2 end-2', 'bottom-2 start-2', 'bottom-2 end-2'] as const;

/*===== Module Panel =====*/

/**
 * A housing module: one shell border, a hard molded ledge, and a printed header strip. Deliberately
 * simpler than the first showcase card (no seam, no soft drop shadow, no double border), so content
 * and controls carry the detail instead of the frame.
 *
 * @param props - Printed marking/serial, optional title and description, body, footer, and screws.
 * @returns A semantic section styled as an instrument module.
 */
export function ModulePanel({
  marking,
  serial,
  title,
  description,
  children,
  footer,
  fastened = false,
  className,
}: ModulePanelProps) {
  return (
    <section
      aria-label={title ?? marking}
      className={cn(
        'border-border-shell bg-card text-card-foreground shadow-panel rounded-card relative flex flex-col border',
        className,
      )}
    >
      {fastened &&
        fastenerPositions.map((position) => (
          <span
            key={position}
            aria-hidden="true"
            className={cn(
              'border-border-fastener bg-indicator-metal shadow-fastener absolute size-1.5 rounded-full border',
              position,
            )}
          />
        ))}

      {/*------ Header strip ------*/}
      <header className="border-border/15 flex items-center justify-between gap-4 border-b px-5 py-3">
        <span className={cn(markingClassName, 'flex items-center gap-2')}>
          <span aria-hidden="true" className="bg-primary rounded-indicator size-1.5" />
          {marking}
        </span>
        {serial && (
          <span className={codeMarkingClassName}>
            <bdi dir="ltr">{serial}</bdi>
          </span>
        )}
      </header>

      {/*------ Body ------*/}
      <div className="flex flex-1 flex-col gap-6 p-5">
        {(title || description) && (
          <div className="flex flex-col gap-1.5">
            {title && <h2 className="font-industrial text-xl leading-tight font-semibold">{title}</h2>}
            {description && <p className="text-content-secondary text-sm leading-6">{description}</p>}
          </div>
        )}
        {children}
      </div>

      {footer && <footer className="border-border/15 border-t px-5 py-3">{footer}</footer>}
    </section>
  );
}

/*===== Display Window =====*/

/**
 * A dark display window sunk into the housing. Text inside uses the instrument mono and the display
 * foreground; use it for live values (timers, counters, meters), never for static copy.
 *
 * @param props - Display content and optional extra classes.
 * @returns A div styled as recessed display glass.
 */
export function DisplayWindow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-display text-display-foreground shadow-display font-instrument rounded-chassis p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/*===== Spec Row =====*/

/**
 * A labelled row inside a catalog module: printed name on top, specimen parts below.
 *
 * @param props - The printed row name and the specimen parts.
 * @returns A labelled group.
 */
export function SpecRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-3">
      <span className={markingClassName}>{label}</span>
      <div className={cn('flex flex-wrap items-center gap-5', className)}>{children}</div>
    </div>
  );
}
