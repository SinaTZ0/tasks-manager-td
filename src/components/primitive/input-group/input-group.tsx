import { type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import type { ComponentProps } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { Button, type ButtonProps } from "#/components/primitive/button/button";
import {
  inputGroupAddonVariants,
  inputGroupButtonVariants,
  inputGroupInputClasses,
  inputGroupTextareaClasses,
  inputGroupTextClasses,
  inputGroupVariants,
} from "./input-group.styles";

/*===== Input Group =====*/

export type InputGroupProps = ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>;
export type InputGroupAddonProps = ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>;
export type InputGroupButtonProps = Omit<ButtonProps, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  };

/**
 * A field plate that holds one control plus addons. The group draws the cut and plate, and shows focus, invalid and
 * disabled states for the control inside it. `variant="glass"` is the field set in the header's display glass.
 */
function InputGroup({ className, variant = "plate", ...props }: InputGroupProps) {
  // A fieldset would add form-grouping semantics and UA styles; this only groups one control with its addons.
  return (
    <div
      data-slot="input-group"
      data-variant={variant}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      {...props}
      className={cn(inputGroupVariants({ variant }), className)}
    />
  );
}

/*===== Addons =====*/

/**
 * Places icons, text, or buttons beside or around the control.
 * Clicking the addon (but not a button inside it) focuses the group's input, like clicking a label.
 */
function InputGroupAddon({ className, align = "inline-start", ...props }: InputGroupAddonProps) {
  // The click handler is a pointer convenience; keyboard users already tab straight to the input.
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

/**
 * A compact Button for addons; defaults to `type="button"` so it never submits the form by accident. The default
 * `ghost` is printed on the plate; pass a keycap variant (`secondary`, `default`) for a small key seated in it.
 */
function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: InputGroupButtonProps) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={size ?? "xs"}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} className={cn(inputGroupTextClasses, className)} />;
}

/*===== Controls =====*/

// The controls are bare native elements, not Input and Textarea: those bring their own cut and plate, and here the
// group draws them.

function InputGroupInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive data-slot="input-group-control" {...props} className={cn(inputGroupInputClasses, className)} />
  );
}

function InputGroupTextarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="input-group-control" {...props} className={cn(inputGroupTextareaClasses, className)} />;
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea };
