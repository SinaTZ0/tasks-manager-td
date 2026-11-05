import { cva } from "class-variance-authority";
import { composeStyles, defineStyles, joinStyles } from "../styles";

/*===== Plate =====*/

// The opposite theme's plastic, with no lip of its own: a pale lip prints a crescent in a card's corner. `surface-grain`
// reads `--grain`, so the plate swaps in the other theme's tile.
const twPlate = defineStyles({
  layout: "relative z-10 flex shrink-0 items-center justify-center",
  appearance: "bg-hold-key-plate surface-grain shadow-hold-key-well [--grain:var(--hold-key-grain)]",
});

const twShape = defineStyles({
  // Fills the corner of a card: its height comes from the row it stands in.
  corner: { geometry: "w-full rounded-es-card" },
  inline: { geometry: "size-11 rounded-chassis" },
});

const holdKeyPlateVariants = cva(joinStyles(twPlate), {
  variants: { shape: composeStyles(twShape) },
  defaultVariants: { shape: "corner" },
});

/*===== Key =====*/

const holdKeyPressClasses = joinStyles(
  defineStyles({
    layout: "group/hold-key",
    interaction: "cursor-pointer touch-none outline-none select-none",
    focus:
      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid",
  }),
);

/*===== Face =====*/

// No gradients (docs/frontend/app-identity.md → Mood): every curve of the mushroom is a hard inset, like the keycaps.
const holdKeySeatClasses = joinStyles(
  defineStyles({
    layout: "relative grid place-items-center",
    geometry: "size-7.5 rounded-full",
    appearance: "bg-cut shadow-hold-key-seat",
  }),
);

const holdKeyCapClasses = joinStyles(
  defineStyles({
    layout: "relative -translate-y-px",
    geometry: "size-6 rounded-full",
    appearance: "bg-highlight shadow-hold-key-cap",
    interaction: "transition-[translate,box-shadow,filter] duration-75 ease-instrument",
    active:
      "group-data-sunk/hold-key:translate-y-px group-data-sunk/hold-key:shadow-hold-key-cap-sunk group-data-sunk/hold-key:brightness-92",
    state: "group-data-flare/hold-key:animate-hold-key-cap",
    motion: "motion-reduce:animate-none!",
  }),
);

const holdKeyDishClasses = joinStyles(
  defineStyles({
    layout: "absolute inset-1",
    geometry: "rounded-full",
    appearance: "shadow-hold-key-dish",
  }),
);

const holdKeyRingSvgClasses = joinStyles(
  defineStyles({
    layout: "pointer-events-none absolute inset-0 -rotate-90",
    geometry: "size-full",
    appearance: "text-signal-action",
    // The firing takes over from the ring: it goes out at once and never drains.
    state: "group-data-fired/hold-key:opacity-0 group-data-flare/hold-key:opacity-0",
  }),
);

const holdKeyFiringSvgClasses = joinStyles(
  defineStyles({
    layout: "pointer-events-none absolute inset-0 overflow-visible",
    geometry: "size-full",
    appearance: "text-signal-action",
  }),
);

const holdKeyAfterglowClasses = joinStyles(
  defineStyles({
    appearance: "opacity-0",
    state: "group-data-flare/hold-key:animate-hold-key-ring",
    motion: "motion-reduce:animate-none!",
  }),
);

const holdKeySonarClasses = joinStyles(
  defineStyles({
    layout: "hold-key-pulse",
    state: "group-data-flare/hold-key:animate-hold-key-sonar",
    motion: "motion-reduce:animate-none!",
  }),
);

const holdKeyEchoClasses = joinStyles(
  defineStyles({
    layout: "hold-key-pulse",
    state: "group-data-flare/hold-key:animate-hold-key-sonar-echo",
    motion: "motion-reduce:animate-none!",
  }),
);

export {
  holdKeyAfterglowClasses,
  holdKeyCapClasses,
  holdKeyDishClasses,
  holdKeyEchoClasses,
  holdKeyFiringSvgClasses,
  holdKeyPlateVariants,
  holdKeyPressClasses,
  holdKeyRingSvgClasses,
  holdKeySeatClasses,
  holdKeySonarClasses,
  twShape,
};
