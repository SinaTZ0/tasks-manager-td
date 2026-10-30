import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { CSSProperties } from "react";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

import {
  progressClasses,
  progressIndicatorClasses,
  progressLabelClasses,
  progressThresholdClasses,
  progressTrackClasses,
  progressValueClasses,
} from "./progress.styles";

/*===== Helpers =====*/

/** Keeps a percentage on the track, so a runaway value or a plan past `max` never draws outside the meter. */
function clampPercent(n: number) {
  return Math.min(Math.max(n, 0), 100);
}

/**
 * Turns the plan threshold into the two CSS positions the meter needs: `threshold`, where the tick sits along the
 * track, and `split`, where the colour switches along the lit part (which is only `value` long).
 */
function thresholdPositions({
  value,
  threshold,
  min,
  max,
}: {
  value: number | null | undefined;
  threshold: number | undefined;
  min: number;
  max: number;
}) {
  if (threshold === undefined || max <= min) return { threshold: undefined, split: undefined };

  const lit = (value ?? min) - min;
  const plan = threshold - min;

  return {
    threshold: `${clampPercent((plan / (max - min)) * 100)}%`,
    split: lit > 0 ? `${clampPercent((plan / lit) * 100)}%` : "100%",
  };
}

/*===== Progress =====*/

export type ProgressProps = ProgressPrimitive.Root.Props & {
  /**
   * The planned amount on the same scale as `value` (e.g. the estimate when the value is time spent). Segments past it
   * light orange and a tick marks it. Leave it out for a plain meter.
   */
  threshold?: number;
};

/**
 * A segmented level meter. Children (`ProgressLabel`, `ProgressValue`) sit on the line above the meter. Give
 * `getAriaValueText` a readable value ("45 of 60 minutes") when the raw number means little on its own. `value={null}`
 * is work of unknown length: a lit block sweeps along the meter, announced as "loading" in the page's language (Base
 * UI's own text is English).
 */
function Progress({
  className,
  children,
  value,
  threshold,
  min = 0,
  max = 100,
  getAriaValueText = (formattedValue, rawValue) => (rawValue === null ? m.common_loading() : formattedValue),
  ...props
}: ProgressProps) {
  const isOver = threshold !== undefined && value !== null && value !== undefined && value > threshold;
  const positions = thresholdPositions({ value, threshold, min, max });

  return (
    <ProgressPrimitive.Root
      value={value}
      min={min}
      max={max}
      getAriaValueText={getAriaValueText}
      data-slot="progress"
      data-over={isOver || undefined}
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(progressClasses, className(state))
          : cn(progressClasses, className)
      }
    >
      {children}
      <ProgressTrack style={{ "--threshold": positions.threshold, "--split": positions.split } as CSSProperties}>
        <ProgressIndicator />
        {threshold !== undefined && <span data-slot="progress-threshold" className={progressThresholdClasses} />}
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(progressTrackClasses, className(state))
          : cn(progressTrackClasses, className)
      }
    />
  );
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(progressIndicatorClasses, className(state))
          : cn(progressIndicatorClasses, className)
      }
    />
  );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(progressLabelClasses, className(state))
          : cn(progressLabelClasses, className)
      }
    />
  );
}

/** The value readout, in the instrument mono. Base UI formats it with the locale's digits. */
function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(progressValueClasses, className(state))
          : cn(progressValueClasses, className)
      }
    />
  );
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
