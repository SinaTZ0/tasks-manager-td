import type { ReactNode } from 'react';
import { GripVertical, Lock, MessageSquare } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { AvatarCap } from './avatar-cap';
import { codeMarkingClassName, markingClassName } from './instrument.recipes';
import { Led, type LedSignal, type LedState } from './led';
import { Marking, PriorityMark, Tag, type PriorityLevel } from './markings';

/*===== Types =====*/

export type TaskRunState = 'idle' | 'running' | 'paused' | 'blocked' | 'done';

export type ShowcaseTask = {
  code: string;
  title: string;
  priority: PriorityLevel;
  owner: string;
  assignee: string;
  labels: readonly { name: string; swatch: 'action' | 'attention' | 'selection' | 'positive' | 'neutral' }[];
  runState: TaskRunState;
  /** Logged time as `h:mm`. */
  spent?: string;
  due?: string;
  comments?: number;
  checklist?: { done: number; total: number };
  /** Code of the task this one waits for. */
  blockedBy?: string;
};

/*===== Run State Map =====*/

// One LED per card states what the work is doing; the printed word repeats it for non-colour readers.
const runStateLed = {
  idle: { signal: 'action', state: 'off', label: 'آماده' },
  running: { signal: 'positive', state: 'blink', label: 'در حال اجرا' },
  paused: { signal: 'attention', state: 'on', label: 'مکث' },
  blocked: { signal: 'attention', state: 'blink', label: 'مسدود' },
  done: { signal: 'positive', state: 'on', label: 'تمام' },
} satisfies Record<TaskRunState, { signal: LedSignal; state: LedState; label: string }>;

/*===== Task Card =====*/

/**
 * A kanban card as a small housing module: code, run-state LED, and priority on a printed header;
 * title and labels on the face; people and time on the footer. Blocked tasks get a printed warning
 * strip naming the blocker, so the dependency is visible without opening the card.
 *
 * Owner and assignee are both shown when they differ, matching the delegation rule that the owner
 * never changes when work is handed to someone else.
 *
 * @param props - The task to render.
 * @returns An article representing one task card.
 */
export function TaskCard({ task }: { task: ShowcaseTask }) {
  const led = runStateLed[task.runState];
  const isDelegated = task.owner !== task.assignee;

  return (
    <article
      aria-label={`${task.code} ${task.title}`}
      className={cn(
        'border-border-shell bg-card text-card-foreground shadow-panel rounded-card relative flex flex-col border',
        task.runState === 'done' && 'opacity-75',
      )}
    >
      {/*------ Header strip ------*/}
      <header className="border-border/15 flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="flex items-center gap-2">
          <GripVertical aria-hidden="true" className="text-muted-foreground size-3.5 cursor-grab" />
          <Marking code>{task.code}</Marking>
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Led signal={led.signal} state={led.state} />
            <span className={markingClassName}>{led.label}</span>
          </span>
          <PriorityMark level={task.priority} />
        </span>
      </header>

      {/*------ Face ------*/}
      <div className="flex flex-col gap-3 px-3 py-3">
        <h3 className={cn('text-sm leading-6 font-semibold', task.runState === 'done' && 'line-through')}>
          {task.title}
        </h3>
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.labels.map((label) => (
              <Tag key={label.name} swatch={label.swatch}>
                {label.name}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/*------ Blocked strip ------*/}
      {task.blockedBy && (
        <div className="bg-signal-attention/15 border-signal-attention/60 flex items-center gap-2 border-y px-3 py-1.5 text-xs">
          <Lock aria-hidden="true" className="size-3.5" />
          <span>منتظر</span>
          <Marking code className="text-foreground">
            {task.blockedBy}
          </Marking>
        </div>
      )}

      {/*------ Footer ------*/}
      <footer className="flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          {isDelegated && <AvatarCap name={task.owner} owner />}
          <AvatarCap name={task.assignee} />
        </span>
        <span className="flex items-center gap-3">
          {task.checklist && (
            <FooterReadout label="چک‌لیست">{`${task.checklist.done}/${task.checklist.total}`}</FooterReadout>
          )}
          {task.comments !== undefined && (
            <span className={cn(codeMarkingClassName, 'flex items-center gap-1')}>
              <MessageSquare aria-hidden="true" className="size-3" />
              <bdi dir="ltr">{task.comments}</bdi>
              <span className="sr-only">نظر</span>
            </span>
          )}
          {task.spent && <FooterReadout label="زمان صرف‌شده">{task.spent}</FooterReadout>}
          {task.due && <FooterReadout label="سررسید">{task.due}</FooterReadout>}
        </span>
      </footer>
    </article>
  );
}

/*===== Footer Readout =====*/

/**
 * A mono value in the card footer with a screen-reader-only name, since the footer is too tight for
 * printed labels on every value.
 *
 * @param props - Accessible name and the value to print.
 * @returns A span with an LTR-isolated mono value.
 */
function FooterReadout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={codeMarkingClassName}>
      <span className="sr-only">{label}: </span>
      <bdi dir="ltr">{children}</bdi>
    </span>
  );
}

/*===== Board Column =====*/

/**
 * A board column: printed name and a mono `count/limit` readout over a stack of cards. When the WIP
 * limit is exceeded the readout LED lights yellow (attention), matching the WIP rule in the brief.
 *
 * @param props - Column name, task count, optional WIP limit, and the cards.
 * @returns A labelled section containing the card stack.
 */
export function BoardColumn({
  title,
  count,
  wipLimit,
  children,
}: {
  title: string;
  count: number;
  wipLimit?: number | undefined;
  children: ReactNode;
}) {
  const isOverLimit = wipLimit !== undefined && count > wipLimit;
  const readout =
    wipLimit === undefined
      ? String(count).padStart(2, '0')
      : `${String(count).padStart(2, '0')}/${String(wipLimit).padStart(2, '0')}`;

  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3">
      <header className="border-foreground/70 flex items-center justify-between border-b-2 pb-2">
        <h3 className="font-industrial text-sm font-semibold">{title}</h3>
        <span className="flex items-center gap-2">
          {wipLimit !== undefined && (
            <Led
              signal="attention"
              state={isOverLimit ? 'on' : 'off'}
              label={isOverLimit ? 'از سقف کار گذشته' : undefined}
            />
          )}
          <span className="font-instrument text-xs">
            <bdi dir="ltr">{readout}</bdi>
          </span>
        </span>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
