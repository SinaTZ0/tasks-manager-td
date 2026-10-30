import { Slider as BaseSlider } from '@base-ui/react/slider';

import { cn } from '@/shared/lib/utils';
import { codeMarkingClassName, markingClassName } from './instrument.recipes';

/*===== Types =====*/

type FaderProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Values printed under the slot as a scale. */
  ticks?: readonly number[];
  /** Formats the live value readout and the tick labels. */
  format?: (value: number) => string;
};

/*===== Fader =====*/

/**
 * A horizontal fader: a narrow machined slot with a lit fill and a grooved cap you drag along it,
 * plus a printed scale and a mono value readout. Built on Base UI Slider for keyboard, pointer, and
 * ARIA support; direction follows the surrounding DirectionProvider.
 *
 * @param props - Label, controlled value and range, optional ticks and value formatter.
 * @returns A Base UI slider styled as a mixer fader.
 */
export function Fader({ label, value, onValueChange, min, max, step = 1, ticks, format = String }: FaderProps) {
  return (
    <BaseSlider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => onValueChange(Array.isArray(next) ? next[0] : next)}
      className="flex flex-col gap-3"
    >
      {/*------ Label and readout ------*/}
      <div className="flex items-baseline justify-between">
        <BaseSlider.Label className={markingClassName}>{label}</BaseSlider.Label>
        <BaseSlider.Value className="font-instrument text-sm font-medium">
          {(_, values) => <bdi dir="ltr">{format(values[0] ?? value)}</bdi>}
        </BaseSlider.Value>
      </div>

      {/*------ Slot, fill, and cap ------*/}
      <BaseSlider.Control className="flex h-8 touch-none items-center select-none">
        <BaseSlider.Track className="bg-surface-keycap-well shadow-socket-inset rounded-chassis-compact relative h-2 w-full">
          <BaseSlider.Indicator className="bg-primary rounded-chassis-compact opacity-85" />
          <BaseSlider.Thumb
            getAriaValueText={(_formatted, raw) => format(raw)}
            className={cn(
              'rounded-keycap-compact bg-keycap-secondary shadow-keycap-secondary-compact relative h-7 w-4',
              // Centre groove makes the cap read as a fader knob and shows its exact position
              "after:bg-foreground/70 after:absolute after:inset-x-1 after:top-1/2 after:h-px after:-translate-y-1/2 after:content-['']",
              'has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>

      {/*------ Printed scale ------*/}
      {ticks && (
        <div aria-hidden="true" className="flex justify-between">
          {ticks.map((tick) => (
            <span key={tick} className={codeMarkingClassName}>
              <bdi dir="ltr">{format(tick)}</bdi>
            </span>
          ))}
        </div>
      )}
    </BaseSlider.Root>
  );
}
