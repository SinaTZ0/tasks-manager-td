import { type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger, useTapTooltip } from "#/components/primitive/tooltip/tooltip";
import { cn } from "#/lib/utils";
import {
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
} from "./hold-key.styles";

/*===== Hold =====*/
const HOLD_MS = 500;
/** How long the cap stays down after firing, so the click is felt. */
const SETTLE_MS = 320;
/** Long enough for the ring to have gone out before it may animate again. */
const SPENT_MS = 80;
/** How long a firing's effect runs, whether or not the key is still held. The longest effect fits inside it. */
const FLARE_MS = 950;

/** `spent` is the moment after a fired key is let go: the ring goes out at once, where a cancelled press drains. */
type Phase = "idle" | "holding" | "fired" | "spent";

/**
 * Press and hold: `onFire` runs once the press has lasted `HOLD_MS`; letting go sooner does nothing. A press never
 * reaches what the key stands on, which may be something to drag. Space and Enter hold the same way.
 */
function useHold(onFire: () => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [flare, setFlare] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flareEnd = useRef<ReturnType<typeof setTimeout>>(undefined);
  const firedAt = useRef(0);

  useEffect(
    () => () => {
      clearTimeout(hold.current);
      clearTimeout(settle.current);
      clearTimeout(flareEnd.current);
    },
    [],
  );

  const start = () => {
    if (hold.current) return;
    clearTimeout(settle.current);
    firedAt.current = 0;
    // Off before a new press, so a second firing starts its effect again.
    setFlare(false);
    setPhase("holding");
    hold.current = setTimeout(() => {
      hold.current = undefined;
      setPhase("fired");
      firedAt.current = Date.now();
      setFlare(true);
      flareEnd.current = setTimeout(() => setFlare(false), FLARE_MS);
      onFire();
    }, HOLD_MS);
  };
  const stop = () => {
    clearTimeout(hold.current);
    hold.current = undefined;
    // A fired key stays down until it is let go, and long enough for the click to be felt.
    if (firedAt.current) {
      const left = Math.max(0, firedAt.current + SETTLE_MS - Date.now());
      firedAt.current = 0;
      settle.current = setTimeout(() => {
        setPhase("spent");
        settle.current = setTimeout(() => setPhase("idle"), SPENT_MS);
      }, left);
    } else {
      setPhase((current) => (current === "holding" ? "idle" : current));
    }
  };

  return {
    phase,
    flare,
    handlers: {
      onPointerDown: (event: React.PointerEvent) => {
        event.stopPropagation();
        start();
      },
      // A press doesn't take the focus: the card would draw its focus ring round itself each time.
      onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onBlur: stop,
      // A long press on a touch screen would open the context menu.
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
      onKeyDown: (event: React.KeyboardEvent) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          start();
        }
      },
      onKeyUp: stop,
    },
  };
}

/*===== Face =====*/

/** The seat's size and the ring's radius and width, in pixels. */
const SEAT = 30;
const RADIUS = 13.75;
const RING = 2.5;

const ringCircle = { cx: SEAT / 2, cy: SEAT / 2, r: RADIUS, fill: "none", stroke: "currentColor" };

/**
 * A small emergency-stop mushroom: a cap standing proud of its black seat on a ledge, with a dished top. The ring fills
 * clockwise round the cap while the key is held. A press given up early drains fast, which says it was cancelled. Once
 * fired the ring never drains: the cap flashes and cools like a lamp, the ring cools with it, and two pulses run out
 * over what the key stands on. The face reads the key's `group/hold-key` state.
 */
function HoldKeyFace() {
  return (
    <span className={holdKeySeatClasses}>
      {/*------ Hold Ring ------*/}
      <svg aria-hidden="true" viewBox={`0 0 ${SEAT} ${SEAT}`} className={holdKeyRingSvgClasses}>
        <circle {...ringCircle} strokeWidth={RING} pathLength={1} className="hold-key-ring" />
      </svg>

      {/*------ Firing ------*/}
      <svg aria-hidden="true" viewBox={`0 0 ${SEAT} ${SEAT}`} className={holdKeyFiringSvgClasses}>
        <circle {...ringCircle} strokeWidth={RING} className={holdKeyAfterglowClasses} />
        <circle {...ringCircle} strokeWidth={2.5} vectorEffect="non-scaling-stroke" className={holdKeySonarClasses} />
        <circle {...ringCircle} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className={holdKeyEchoClasses} />
      </svg>

      {/*------ Cap ------*/}
      <span className={holdKeyCapClasses}>
        <span className={holdKeyDishClasses} />
      </span>
    </span>
  );
}

/*===== Hold Key Plate =====*/

/** The plate and its cap with nothing to press: where a key shows only as a picture of itself, like a card in a drag. */
function HoldKeyPlate({ shape }: VariantProps<typeof holdKeyPlateVariants>) {
  return (
    <span data-slot="hold-key-plate" aria-hidden="true" className={holdKeyPlateVariants({ shape })}>
      <HoldKeyFace />
    </span>
  );
}

/*===== Hold Key =====*/

export type HoldKeyProps = VariantProps<typeof holdKeyPlateVariants> & {
  /** What the key does, read out by a screen reader. */
  label: string;
  /** The tooltip that says to hold it. */
  hint: string;
  onFire: () => void;
};

/**
 * The red mushroom key on a plate of display glass, for an action that goes out to other people the moment it fires,
 * with no confirmation: a press must last half a second, and a short one does nothing. It stands in the `corner` of a
 * card or `inline` beside other keys. The whole plate is the press target, raised over a card's stretched link. On a
 * touch screen a short press shows the hint, or the key would seem not to work.
 */
function HoldKey({ label, hint, onFire, shape }: HoldKeyProps) {
  const { phase, flare, handlers } = useHold(onFire);
  const { root, tapped } = useTapTooltip();

  return (
    <Tooltip {...root}>
      <TooltipTrigger
        closeOnClick={false}
        render={
          <button
            type="button"
            data-slot="hold-key"
            data-holding={phase === "holding" || undefined}
            data-sunk={phase === "holding" || phase === "fired" || undefined}
            data-fired={phase === "fired" || undefined}
            data-spent={phase === "spent" || undefined}
            data-flare={flare || undefined}
            aria-label={label}
            className={cn(holdKeyPlateVariants({ shape }), holdKeyPressClasses)}
            {...handlers}
            // A held press ends in a click too, while the key is still down: only a short one is left idle by then.
            onClick={() => phase === "idle" && tapped()}
          >
            <HoldKeyFace />
          </button>
        }
      />
      <TooltipContent aria-hidden="true">{hint}</TooltipContent>
    </Tooltip>
  );
}

export { HoldKey, HoldKeyPlate };
