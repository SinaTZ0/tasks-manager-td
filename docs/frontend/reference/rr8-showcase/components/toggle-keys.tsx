import type { ReactNode } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';

import { cn } from '@/shared/lib/utils';
import { keycapVariants, slotClassName } from './instrument.recipes';
import { Led, type LedSignal } from './led';

/*===== Types =====*/

export type ToggleKeyOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  /** Numeral printed on pads, or a shortcut printed on segmented keys. */
  marking?: string;
  signal?: LedSignal;
};

type SingleSelectProps<Value extends string> = {
  'aria-label': string;
  options: readonly ToggleKeyOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  className?: string;
};

/*===== Helpers =====*/

/**
 * Adapts Base UI ToggleGroup's array value to a single required selection. Pressing the already
 * latched key would empty the group; a mode selector must always have one mode, so that is ignored.
 *
 * @param input - The incoming group value and the single-value change handler.
 * @returns Nothing; calls `onValueChange` only when a new key was latched.
 */
function commitSingleValue<Value extends string>({
  groupValue,
  onValueChange,
}: {
  groupValue: string[];
  onValueChange: (value: Value) => void;
}) {
  const [next] = groupValue;

  if (next) {
    onValueChange(next as Value);
  }
}

/*===== Segmented Keys =====*/

/**
 * A row of latching keys sharing one long cut, like a mode selector strip. Exactly one key is down
 * at a time; its LED lights in the option's signal colour (blue by default: blue means selection). Arrow keys move between options and
 * follow the document direction when wrapped in Base UI's DirectionProvider.
 *
 * @param props - Accessible group name, options, the selected value, and its change handler.
 * @returns A Base UI toggle group seated in a shared slot.
 */
export function SegmentedKeys<Value extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SingleSelectProps<Value>) {
  return (
    <BaseToggleGroup
      {...props}
      value={[value]}
      onValueChange={(groupValue) => commitSingleValue({ groupValue, onValueChange })}
      className={cn(slotClassName, className)}
    >
      {options.map((option) => (
        <BaseToggle
          key={option.value}
          value={option.value}
          // The slot already supplies the void, so these keys carry no cut of their own
          className={cn(
            keycapVariants({ tone: 'secondary', size: 'compact' }),
            'min-w-0 flex-1 before:hidden max-sm:px-2',
          )}
          render={(renderProps, state) => (
            <button type="button" {...renderProps}>
              <Led signal={option.signal ?? 'selection'} state={state.pressed ? 'on' : 'off'} />
              <span>{option.label}</span>
            </button>
          )}
        />
      ))}
    </BaseToggleGroup>
  );
}

/*===== Pad Keys =====*/

/**
 * A grid of square latching pads, each in its own cut. Used where the options are first-class modes
 * worth a big target (task status). Pads print a numeral so the grid doubles as a keyboard map.
 *
 * @param props - Accessible group name, options, the selected value, its change handler, and column count.
 * @returns A Base UI toggle group laid out as a pad grid.
 */
export function PadKeys<Value extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SingleSelectProps<Value>) {
  return (
    <BaseToggleGroup
      {...props}
      value={[value]}
      onValueChange={(groupValue) => commitSingleValue({ groupValue, onValueChange })}
      className={cn('grid grid-cols-3 gap-4', className)}
    >
      {options.map((option) => (
        <BaseToggle
          key={option.value}
          value={option.value}
          className={keycapVariants({ tone: 'secondary', size: 'pad' })}
          render={(renderProps, state) => (
            <button type="button" {...renderProps}>
              <Led
                signal={option.signal ?? 'selection'}
                state={state.pressed ? 'on' : 'off'}
                className="absolute end-2.5 top-2.5"
              />
              <span className="font-instrument text-lg leading-none font-medium">
                <bdi dir="ltr">{option.marking}</bdi>
              </span>
              <span className="leading-tight">{option.label}</span>
            </button>
          )}
        />
      ))}
    </BaseToggleGroup>
  );
}
