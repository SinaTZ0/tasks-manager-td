import type { ComponentProps, ReactNode } from "react";
import { cn } from "#/lib/utils";

import { Led, type LedProps } from "../led/led";
import {
  stepperClasses,
  stepperItemClasses,
  stepperSeparatorClasses,
  stepperStepPressableClasses,
  stepperStepVariants,
} from "./stepper.styles";

/*===== Stepper =====*/

export type StepState = "complete" | "current" | "upcoming";

/**
 * A track of stages in order, printed along a tray: the stages passed lit, the current one a latched key, the ones
 * ahead dim, and the grooves between them lit as far as the work has come. Name it with `aria-label`; the current
 * stage is announced through `aria-current="step"`.
 */
function Stepper({ className, ...props }: ComponentProps<"ol">) {
  return <ol data-slot="stepper" {...props} className={cn(stepperClasses, className)} />;
}

/*===== Stepper Item =====*/

export type StepperItemProps = Omit<ComponentProps<"li">, "children" | "onSelect"> & {
  state: StepState;
  /** The current stage is live (someone works on it): its LED blinks. */
  live?: boolean;
  /** The LED's colour once the stage is reached: green by default, as progress. */
  signal?: LedProps["signal"];
  /** Makes a stage other than the current one a key that goes there. */
  onSelect?: (() => void) | undefined;
  /** The key's accessible name, when pressing it does more than its printed name says ("Move to Review"). */
  selectLabel?: string | undefined;
  children: ReactNode;
};

/**
 * One stage: its LED (green and lit once reached, blinking while live), its printed name, and the groove leading into
 * it. A stage with `onSelect` is a ghost key; the current one never is.
 */
function StepperItem({
  state,
  live = false,
  signal = "positive",
  onSelect,
  selectLabel,
  children,
  className,
  ...props
}: StepperItemProps) {
  const led = (
    <Led
      signal={signal}
      state={state === "upcoming" ? "off" : live && state === "current" ? "blink" : "on"}
      size="sm"
    />
  );
  const classes = cn(stepperStepVariants({ state }));

  return (
    <li data-slot="stepper-item" data-state={state} {...props} className={cn(stepperItemClasses, className)}>
      <span
        data-slot="stepper-separator"
        data-lit={state === "upcoming" ? undefined : ""}
        aria-hidden="true"
        className={stepperSeparatorClasses}
      />
      {state === "current" ? (
        <span data-slot="stepper-step" data-active="" aria-current="step" className={classes}>
          {led}
          {children}
        </span>
      ) : onSelect ? (
        <button
          type="button"
          data-slot="stepper-step"
          aria-label={selectLabel}
          onClick={onSelect}
          className={cn(classes, stepperStepPressableClasses)}
        >
          {led}
          {children}
        </button>
      ) : (
        <span data-slot="stepper-step" className={classes}>
          {led}
          {children}
        </span>
      )}
    </li>
  );
}

export { Stepper, StepperItem };
