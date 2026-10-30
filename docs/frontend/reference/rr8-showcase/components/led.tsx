import { cn } from '@/shared/lib/utils';

/*===== Types =====*/

export type LedSignal = 'action' | 'positive' | 'attention' | 'selection';
export type LedState = 'on' | 'off' | 'blink';

type LedProps = {
  signal?: LedSignal;
  state?: LedState;
  size?: 'sm' | 'md';
  /** When given, the LED is announced as an image with this name; otherwise it is decorative. */
  label?: string | undefined;
  className?: string | undefined;
};

/*===== Signal Map =====*/

// Each signal colour carries exactly one meaning across the product (see tokens.css signal roles).
const signalClassName = {
  action: 'text-primary',
  positive: 'text-status-positive',
  attention: 'text-signal-attention',
  selection: 'text-signal-selection',
} satisfies Record<LedSignal, string>;

/*===== Led =====*/

/**
 * Renders a square indicator LED. Lit LEDs glow in their signal colour; unlit LEDs stay visible as
 * grey plastic so the user can see that a state exists even when it is off. Blinking is reserved for
 * "running" states and is disabled for users who prefer reduced motion (the LED then stays lit).
 *
 * @param props - Signal colour, lit state, size, and an optional accessible label.
 * @returns A decorative span, or an `img`-role span when `label` is provided.
 */
export function Led({ signal = 'action', state = 'on', size = 'sm', label, className }: LedProps) {
  const isLit = state !== 'off';

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      data-state={state}
      role={label ? 'img' : undefined}
      className={cn(
        'rounded-indicator inline-block shrink-0',
        size === 'sm' ? 'size-1.5' : 'size-2',
        signalClassName[signal],
        isLit ? 'shadow-led-glow bg-current' : 'bg-indicator-off shadow-led-off',
        state === 'blink' && 'motion-safe:animate-led-blink',
        className,
      )}
    />
  );
}
