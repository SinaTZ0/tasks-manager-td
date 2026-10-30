import { Meter as BaseMeter } from '@base-ui/react/meter';

import { cn } from '@/shared/lib/utils';

/*===== Types =====*/

type LevelMeterProps = {
  label: string;
  /** Measured amount, e.g. minutes spent. */
  value: number;
  /** Planned amount, e.g. the estimate. Segments past it light in the action colour. */
  threshold: number;
  /** Full scale of the meter; defaults to 150% of the threshold so overruns stay visible. */
  max?: number;
  segments?: number;
  /** Human-readable value for assistive tech, e.g. "۴۵ از ۶۰ دقیقه". */
  valueText: string;
};

/*===== Level Meter =====*/

/**
 * A segmented level meter, like a channel meter on a mixer. Segments within the plan glow in the
 * positive signal; segments past the plan glow orange, so an overrun is visible at a glance. A
 * printed tick marks where the plan ends.
 *
 * Built on Base UI Meter so the value is exposed with `role="meter"`; the segments are decorative.
 *
 * @param props - Measured value, plan threshold, optional scale, segment count, and value text.
 * @returns A meter element drawn for a dark display window.
 */
export function LevelMeter({
  label,
  value,
  threshold,
  max = threshold * 1.5,
  segments = 24,
  valueText,
}: LevelMeterProps) {
  // Clamp so a runaway timer still renders a full meter instead of overflowing the segment loop
  const clamped = Math.min(Math.max(value, 0), max);
  const litCount = Math.round((clamped / max) * segments);
  const thresholdIndex = Math.round((threshold / max) * segments);

  return (
    <BaseMeter.Root value={clamped} max={max} getAriaValueText={() => valueText} className="flex flex-col gap-2">
      <BaseMeter.Label className="text-display-muted font-industrial text-marking font-semibold">
        {label}
      </BaseMeter.Label>
      <div aria-hidden="true" className="relative flex gap-0.5" dir="ltr">
        {Array.from({ length: segments }, (_, index) => {
          const isLit = index < litCount;
          const isOver = index >= thresholdIndex;

          return (
            <span
              key={index}
              className={cn(
                'duration-field h-3 flex-1 rounded-[1px] transition-colors',
                isLit
                  ? isOver
                    ? 'bg-primary text-primary shadow-led-glow'
                    : 'bg-status-positive'
                  : 'bg-display-muted/25',
              )}
            />
          );
        })}
        {/* Plan marker: a printed tick above the segment where the estimate ends */}
        <span
          className="bg-display-foreground absolute -top-1.5 h-1 w-px"
          style={{ left: `${(thresholdIndex / segments) * 100}%` }}
        />
      </div>
    </BaseMeter.Root>
  );
}
