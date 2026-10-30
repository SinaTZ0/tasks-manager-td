import type { ComponentProps, ReactNode } from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';

import { cn } from '@/shared/lib/utils';

/*===== Types =====*/

type RockerSwitchProps = Omit<ComponentProps<typeof BaseSwitch.Root>, 'className'> & {
  label: ReactNode;
  description?: ReactNode;
};

/*===== Rocker Switch =====*/

/**
 * A slide switch: the root is the open cut (the void), the thumb is a small keycap that travels
 * inside it. On, the thumb turns to the action colour and sits at the inline end, so it follows RTL
 * without separate mirrored styles.
 *
 * @param props - Base UI switch props plus a visible label and optional description.
 * @returns A label wrapping the switch, so the whole row toggles it.
 */
export function RockerSwitch({ label, description, ...props }: RockerSwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 has-data-disabled:cursor-not-allowed">
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{label}</span>
        {description && <span className="text-muted-foreground text-xs leading-5">{description}</span>}
      </span>

      <BaseSwitch.Root
        {...props}
        className={cn(
          'relative inline-flex h-8 w-15 shrink-0 cursor-pointer items-center',
          'bg-surface-keycap-well p-cut-gap shadow-socket-inset rounded-chassis',
          'focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
          'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        )}
      >
        <BaseSwitch.Thumb
          className={cn(
            'rounded-keycap-compact h-full w-1/2',
            'bg-keycap-secondary shadow-keycap-secondary-compact',
            // Logical inline offset: start → end in both directions, no rtl: overrides needed
            'duration-field ease-state ms-0 transition-[margin-inline-start,background-color]',
            'data-checked:bg-primary data-checked:shadow-keycap-primary-compact data-checked:ms-[50%]',
          )}
        />
      </BaseSwitch.Root>
    </label>
  );
}
