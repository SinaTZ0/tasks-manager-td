import type { ComponentProps, ReactNode } from 'react';
import { Field as BaseField } from '@base-ui/react/field';

import { cn } from '@/shared/lib/utils';
import { cutoutVariants, markingClassName } from './instrument.recipes';

/*===== Types =====*/

type CutoutFieldProps = Omit<ComponentProps<typeof BaseField.Control>, 'className' | 'render'> & {
  label: ReactNode;
  description?: ReactNode;
  /** A message shown below the field; also marks the field invalid. */
  error?: ReactNode;
  /** Renders a multi-line plate (comments, descriptions) instead of a single-line field. */
  multiline?: boolean;
  className?: string;
};

/*===== Styles =====*/

const plateClassName = cn(
  // Transparent border reserves the focus edge so text never shifts
  'w-full min-w-0 rounded-keycap border border-transparent bg-surface-input px-4 text-start',
  'font-sans text-field font-medium text-input-foreground caret-input-caret [caret-shape:block]',
  'placeholder:text-input-placeholder shadow-input outline-none',
  'autofill:[-webkit-text-fill-color:var(--input-foreground)] autofill:shadow-input-autofill',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
);

/*===== Cutout Field =====*/

/**
 * A labelled text field: a recessed plate seated in the same machined cut as the keys. Focus lights
 * the cut orange; an error lights it yellow (the attention signal) and shows the message, so state
 * reads from the part itself rather than a thin border.
 *
 * Built on Base UI Field so label, description, and error are wired to the control's ARIA.
 *
 * @param props - Label, optional description/error, `multiline`, and native input attributes.
 * @returns A Base UI field root containing label, cut plate, and helper text.
 */
export function CutoutField({ label, description, error, multiline = false, className, ...props }: CutoutFieldProps) {
  const isInvalid = Boolean(error);

  return (
    <BaseField.Root invalid={isInvalid} disabled={props.disabled} className={cn('flex flex-col gap-2', className)}>
      <BaseField.Label className={markingClassName}>{label}</BaseField.Label>

      {/*------ Cut and plate ------*/}
      <span
        className={cn(
          'rounded-keycap relative isolate flex w-full',
          cutoutVariants({ size: 'regular' }),
          'before:duration-field before:transition-colors',
          // :focus-within covers both the input and the textarea render target
          'focus-within:before:bg-ring',
          isInvalid && 'before:bg-signal-attention',
        )}
      >
        <BaseField.Control
          {...props}
          className={cn(plateClassName, multiline ? 'min-h-28 resize-none py-3 leading-7' : 'h-12')}
          render={multiline ? <textarea /> : undefined}
        />
      </span>

      {description && !isInvalid && (
        <BaseField.Description className="text-muted-foreground text-xs leading-5">{description}</BaseField.Description>
      )}
      {/* `match` forces the message visible: validity here comes from the caller, not native constraints */}
      {isInvalid && (
        <BaseField.Error match={true} className="text-foreground flex items-center gap-2 text-xs leading-5">
          <span aria-hidden="true" className="bg-signal-attention rounded-indicator size-1.5 shrink-0" />
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
}
