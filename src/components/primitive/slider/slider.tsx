import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "#/lib/utils";

import {
  sliderClasses,
  sliderControlClasses,
  sliderRangeClasses,
  sliderThumbClasses,
  sliderTrackClasses,
} from "./slider.styles";

/*===== Slider =====*/

/**
 * A fader: a grooved cap in a narrow slot, with the slot lit from the start to the cap. Pass an array value for a
 * range (one cap per value). Direction follows the surrounding DirectionProvider, so in Persian the start is on the
 * right and ArrowLeft increases. Give it an `aria-label`, or label it with a visible `Field` label.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props) {
  // One cap per value. A single number is one cap; with no value at all shadcn draws a two-cap range over the scale.
  const values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];
  const thumbCount = typeof value === "number" || typeof defaultValue === "number" ? 1 : values.length;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      aria-label={ariaLabel}
      {...props}
      className={
        typeof className === "function" ? (state) => cn(sliderClasses, className(state)) : cn(sliderClasses, className)
      }
    >
      <SliderPrimitive.Control className={sliderControlClasses}>
        <SliderPrimitive.Track data-slot="slider-track" className={sliderTrackClasses}>
          <SliderPrimitive.Indicator data-slot="slider-range" className={sliderRangeClasses} />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            // The focusable input lives in the thumb, so it needs the name too, not just the group around it
            aria-label={ariaLabel}
            className={sliderThumbClasses}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
