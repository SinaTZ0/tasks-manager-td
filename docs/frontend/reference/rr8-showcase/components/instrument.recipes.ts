import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

/*===== Types =====*/

/** Base UI accepts either a static class or a function of the component state. */
type StateClassName<State> = string | ((state: State) => string | undefined) | undefined;

/*===== Helpers =====*/

/**
 * Resolves a Base UI `className` prop that may be static or state-aware, so local recipes can be
 * merged in front of caller overrides without losing the state-function form.
 *
 * @param className - The caller's static class or state callback.
 * @param state - The Base UI state object for the current render.
 * @returns The caller's resolved class string, or `undefined` when none was given.
 */
export function resolveClassName<State>(className: StateClassName<State>, state: State) {
  return typeof className === 'function' ? className(state) : className;
}

/*===== Cutout =====*/

/**
 * The machined hole every control sits in. Painted on `::before` so it can extend past the control
 * by the cut gap without affecting layout. The near-square cut radius against the rounder keycap is
 * intentional: the void shows most at the corners, like a real key in a milled slot.
 */
export const cutoutVariants = cva(
  [
    "before:pointer-events-none before:absolute before:z-[-2] before:content-['']",
    'before:bg-surface-keycap-well before:shadow-socket-inset',
  ],
  {
    variants: {
      size: {
        compact: 'before:-inset-cut-gap-compact before:rounded-chassis-compact',
        regular: 'before:-inset-cut-gap before:rounded-chassis',
      },
    },
    defaultVariants: { size: 'regular' },
  },
);

/*===== Keycap =====*/

/**
 * One keycap recipe for every pressable part (buttons, toggles, tabs, pads).
 *
 * The real element is transparent; `::after` paints the molded face so it can shrink inside the
 * cut on press. Shrinking (inset) rather than translating keeps the key centred, so the void widens
 * evenly on all sides instead of the key sliding over the lower gap.
 *
 * Momentary keys respond to `:active`; latching parts (Toggle, Tab) hold the same sunk state via
 * `data-pressed` / `data-active`, so "on" always looks like a key that stayed down.
 */
export const keycapVariants = cva(
  [
    'relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-0 bg-transparent select-none',
    'font-industrial font-semibold tracking-normal whitespace-nowrap',
    // Keycap face
    "after:pointer-events-none after:absolute after:inset-0 after:z-[-1] after:rounded-[inherit] after:content-['']",
    'after:transition-[inset,box-shadow,filter] after:duration-press after:ease-instrument',
    'hover:after:brightness-[var(--motion-hover-brightness)]',
    // Sunk state shared by momentary press and latched on-state
    'active:after:brightness-[var(--motion-pressed-brightness)] data-pressed:after:brightness-[var(--motion-pressed-brightness)] data-active:after:brightness-[var(--motion-pressed-brightness)]',
    // Focus ring sits outside the cut so it never hides the void that defines the part
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
    // A disabled key reads as a dead part: the face loses its colour and dims, and the label fades.
    // Grayscale matters for orange keys; translucency alone turned them a muddy maroon over the void.
    'data-disabled:cursor-not-allowed data-disabled:after:grayscale data-disabled:after:opacity-70 data-disabled:[&>*]:opacity-45',
  ],
  {
    variants: {
      tone: {
        primary: 'text-primary-foreground after:bg-primary',
        secondary: 'text-keycap-secondary-foreground after:bg-keycap-secondary',
        graphite: 'text-keycap-graphite-foreground after:bg-keycap-graphite',
      },
      size: {
        compact: cn(
          'h-8 rounded-keycap-compact px-3 text-sm',
          'active:after:inset-[var(--motion-pressed-inset-compact)] active:after:shadow-keycap-pressed-compact',
          'data-pressed:after:inset-[var(--motion-pressed-inset-compact)] data-pressed:after:shadow-keycap-pressed-compact',
          'data-active:after:inset-[var(--motion-pressed-inset-compact)] data-active:after:shadow-keycap-pressed-compact',
        ),
        regular: cn(
          'h-12 rounded-keycap px-5 text-button',
          'active:after:inset-[var(--motion-pressed-inset)] active:after:shadow-keycap-pressed',
          'data-pressed:after:inset-[var(--motion-pressed-inset)] data-pressed:after:shadow-keycap-pressed',
          'data-active:after:inset-[var(--motion-pressed-inset)] data-active:after:shadow-keycap-pressed',
        ),
        // Square pad: marking top, label bottom, like a sampler pad with its printed function
        pad: cn(
          'size-18 flex-col items-start justify-between rounded-keycap p-2.5 text-start text-marking',
          'active:after:inset-[var(--motion-pressed-inset)] active:after:shadow-keycap-pressed',
          'data-pressed:after:inset-[var(--motion-pressed-inset)] data-pressed:after:shadow-keycap-pressed',
        ),
        // Icon-only square key at compact height
        icon: cn(
          'size-8 rounded-keycap-compact p-0',
          'active:after:inset-[var(--motion-pressed-inset-compact)] active:after:shadow-keycap-pressed-compact',
          'data-pressed:after:inset-[var(--motion-pressed-inset-compact)] data-pressed:after:shadow-keycap-pressed-compact',
        ),
      },
    },
    compoundVariants: [
      // Bevels are scaled with the key: a full-size bevel floods a 32px face
      { tone: 'primary', size: ['regular', 'pad'], className: 'after:shadow-keycap-primary' },
      { tone: 'primary', size: ['compact', 'icon'], className: 'after:shadow-keycap-primary-compact' },
      { tone: 'secondary', size: ['regular', 'pad'], className: 'after:shadow-keycap-secondary' },
      { tone: 'secondary', size: ['compact', 'icon'], className: 'after:shadow-keycap-secondary-compact' },
      { tone: 'graphite', size: ['regular', 'pad'], className: 'after:shadow-keycap-graphite' },
      { tone: 'graphite', size: ['compact', 'icon'], className: 'after:shadow-keycap-graphite-compact' },
      // Every key carries its own cut; the cut scales with the key
      { size: ['compact', 'icon'], className: cutoutVariants({ size: 'compact' }) },
      { size: ['regular', 'pad'], className: cutoutVariants({ size: 'regular' }) },
    ],
    defaultVariants: { tone: 'secondary', size: 'regular' },
  },
);

export type KeycapVariantProps = VariantProps<typeof keycapVariants>;

/*===== Slot =====*/

/**
 * A long open cut that holds several parts (segmented keys, tabs, a switch track). The host's own
 * background is the void, so the padding between parts shows as the same black gap as a single cut.
 */
export const slotClassName = cn(
  'inline-flex items-stretch gap-cut-gap rounded-chassis bg-surface-keycap-well p-cut-gap shadow-socket-inset',
);

/*===== Printed Marking =====*/

/** Small printed label on the housing next to a part, like silkscreen on hardware. */
export const markingClassName = 'font-industrial text-marking font-semibold tracking-label text-muted-foreground';

/** Technical code or value marking (serials, ids, shortcuts), always in the instrument mono. */
export const codeMarkingClassName = 'font-instrument text-marking tracking-readout text-muted-foreground';
