import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';
import { codeMarkingClassName, markingClassName } from './instrument.recipes';

/*===== Types =====*/

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

/*===== Marking =====*/

/**
 * Printed housing label. Persian text uses the industrial face; codes and values use the mono face
 * inside an LTR isolate so ids like `TD-42` never get reordered by the surrounding RTL text.
 *
 * @param props - The label content, whether it is a technical code, and optional extra classes.
 * @returns A span styled as silkscreen printing.
 */
export function Marking({
  children,
  code = false,
  className,
}: {
  children: ReactNode;
  code?: boolean;
  className?: string;
}) {
  if (code) {
    return (
      <span className={cn(codeMarkingClassName, className)}>
        <bdi dir="ltr">{children}</bdi>
      </span>
    );
  }

  return <span className={cn(markingClassName, className)}>{children}</span>;
}

/*===== Tag =====*/

// Label swatches reuse the signal roles; a tag never introduces a colour without a meaning.
const tagSwatchClassName = {
  action: 'bg-primary',
  attention: 'bg-signal-attention',
  selection: 'bg-signal-selection',
  positive: 'bg-status-positive',
  neutral: 'bg-indicator-off',
} as const;

/**
 * Renders a task label as a small printed plate with a colour swatch, closer to a label-maker strip
 * than a soft pill badge.
 *
 * @param props - Label text and the signal role of its swatch.
 * @returns An inline label element.
 */
export function Tag({
  children,
  swatch = 'neutral',
}: {
  children: ReactNode;
  swatch?: keyof typeof tagSwatchClassName;
}) {
  return (
    <span className="border-border-shell font-industrial text-marking text-content-secondary rounded-indicator inline-flex h-6 items-center gap-1.5 border px-2 font-semibold">
      <span aria-hidden="true" className={cn('rounded-indicator size-1.5', tagSwatchClassName[swatch])} />
      {children}
    </span>
  );
}

/*===== Priority Mark =====*/

const priorityOrder = ['low', 'medium', 'high', 'urgent'] as const satisfies readonly PriorityLevel[];

export const priorityLabel = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
  urgent: 'فوری',
} satisfies Record<PriorityLevel, string>;

/**
 * Renders priority as a four-step bar scale, like a level indicator. Urgent switches the lit bars to
 * the action signal so it stands out from ordinary high priority without adding a new colour.
 *
 * @param props - The priority level to display.
 * @returns A labelled `img`-role scale.
 */
export function PriorityMark({ level }: { level: PriorityLevel }) {
  const litCount = priorityOrder.indexOf(level) + 1;

  return (
    <span role="img" aria-label={`اولویت ${priorityLabel[level]}`} className="inline-flex items-end gap-0.5" dir="ltr">
      {priorityOrder.map((step, index) => (
        <span
          key={step}
          aria-hidden="true"
          className={cn(
            'rounded-indicator w-1',
            // Rising bar heights make the scale readable even for colour-blind users
            ['h-1.5', 'h-2', 'h-2.5', 'h-3'][index],
            index < litCount ? (level === 'urgent' ? 'bg-primary' : 'bg-foreground') : 'bg-indicator-off',
          )}
        />
      ))}
    </span>
  );
}
