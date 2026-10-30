import type { ComponentProps, ReactNode } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

import { cn } from '@/shared/lib/utils';
import { cutoutVariants } from './instrument.recipes';

/*===== Types =====*/

type CheckKeyProps = Omit<ComponentProps<typeof BaseCheckbox.Root>, 'className'> & {
  label: ReactNode;
};

/*===== Check Key =====*/

/**
 * A checkbox as a tiny latching key: checked, the key sinks and an orange LED lights in its face.
 * Checked labels also dim and strike through, which suits checklist items in a task.
 *
 * @param props - Base UI checkbox props plus the visible label.
 * @returns A label wrapping the checkbox key and its text.
 */
export function CheckKey({ label, ...props }: CheckKeyProps) {
  return (
    <label className="group/check flex cursor-pointer items-center gap-3 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
      <BaseCheckbox.Root
        {...props}
        className={cn(
          'rounded-keycap-compact relative isolate inline-flex size-5 shrink-0 items-center justify-center',
          cutoutVariants({ size: 'compact' }),
          // The face lives on ::after: a background on the root itself would paint under the cut's ::before
          "after:absolute after:inset-0 after:z-[-1] after:rounded-[inherit] after:content-['']",
          'after:bg-keycap-secondary after:shadow-keycap-secondary-compact',
          'after:duration-press after:ease-instrument after:transition-[inset,box-shadow]',
          'data-checked:after:shadow-keycap-pressed-compact data-checked:after:inset-[var(--motion-pressed-inset-compact)]',
          'focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-4',
        )}
      >
        <BaseCheckbox.Indicator className="bg-primary shadow-led-glow text-primary rounded-indicator size-2" />
      </BaseCheckbox.Root>
      <span className="group-has-data-checked/check:text-muted-foreground text-sm transition-colors group-has-data-checked/check:line-through">
        {label}
      </span>
    </label>
  );
}
