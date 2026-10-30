import type { ComponentProps, ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';

import { cn } from '@/shared/lib/utils';
import { keycapVariants, resolveClassName, type KeycapVariantProps } from './instrument.recipes';
import { Led, type LedSignal } from './led';

/*===== Types =====*/

type KeyFaceProps = {
  children?: ReactNode;
  icon?: ReactNode;
  /** Secondary printed marking: a shortcut on normal keys, the big numeral on pads. */
  marking?: ReactNode;
  size: NonNullable<KeycapVariantProps['size']>;
};

type KeyProps = ComponentProps<typeof BaseButton> &
  KeycapVariantProps & {
    icon?: ReactNode;
    marking?: ReactNode;
  };

type LatchKeyProps = ComponentProps<typeof BaseToggle> &
  KeycapVariantProps & {
    icon?: ReactNode;
    marking?: ReactNode;
    /** Colour of the LED that lights while the key is latched down. */
    signal?: LedSignal;
  };

/*===== Key Face =====*/

/**
 * Lays out what is printed on a keycap. Pads put the numeral top-start and the function name
 * bottom-start; every other size prints icon, label, and an optional shortcut in one row.
 *
 * @param props - Printed content and the keycap size that decides the arrangement.
 * @returns The keycap's printed content.
 */
function KeyFace({ children, icon, marking, size }: KeyFaceProps) {
  if (size === 'pad') {
    return (
      <>
        <span className="font-instrument text-lg leading-none font-medium">
          <bdi dir="ltr">{marking}</bdi>
        </span>
        <span className="leading-tight">{children}</span>
      </>
    );
  }

  return (
    <>
      {icon && (
        <span aria-hidden="true" className="inline-flex [&_svg]:size-4">
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
      {/* Shortcut markings are hidden on small screens: keyboard shortcuts mean nothing on touch devices */}
      {marking && (
        <span aria-hidden="true" className="font-instrument text-marking opacity-60 max-sm:hidden">
          <bdi dir="ltr">{marking}</bdi>
        </span>
      )}
    </>
  );
}

/*===== Key =====*/

/**
 * Momentary key: sinks while held and springs back. Use for one-shot actions.
 *
 * Icon-only keys must receive an `aria-label`, because the icon is hidden from assistive tech.
 *
 * @param props - Base UI button props plus keycap tone/size, an icon, and a printed marking.
 * @returns A Base UI button styled as a keycap seated in its cutout.
 */
export function Key({ tone, size = 'regular', icon, marking, children, className, ...props }: KeyProps) {
  return (
    <BaseButton
      type="button"
      {...props}
      data-slot="key"
      className={(state) => cn(keycapVariants({ tone, size }), resolveClassName(className, state))}
    >
      <KeyFace icon={icon} marking={marking} size={size ?? 'regular'}>
        {children}
      </KeyFace>
    </BaseButton>
  );
}

/*===== Latch Key =====*/

/**
 * Latching key: stays sunk while on and lights an LED, like a sampler's mode keys. The LED is the
 * colour-independent cue; the sunk face is the physical one. Built on Base UI Toggle so it exposes
 * `aria-pressed` correctly.
 *
 * @param props - Base UI toggle props plus keycap tone/size, icon, marking, and LED signal.
 * @returns A Base UI toggle styled as a latching keycap.
 */
export function LatchKey({
  tone,
  size = 'regular',
  icon,
  marking,
  signal = 'action',
  children,
  className,
  ...props
}: LatchKeyProps) {
  return (
    <BaseToggle
      {...props}
      data-slot="latch-key"
      className={(state) => cn(keycapVariants({ tone, size }), resolveClassName(className, state))}
      render={(renderProps, state) => (
        <button type="button" {...renderProps}>
          {/* Pads print the LED in the top-end corner; inline keys print it before the label */}
          <Led
            signal={signal}
            state={state.pressed ? 'on' : 'off'}
            className={size === 'pad' ? 'absolute end-2.5 top-2.5' : undefined}
          />
          <KeyFace icon={icon} marking={marking} size={size ?? 'regular'}>
            {children}
          </KeyFace>
        </button>
      )}
    />
  );
}
