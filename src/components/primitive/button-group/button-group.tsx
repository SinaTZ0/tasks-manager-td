import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

import { Separator } from "../separator/separator";
import { buttonGroupSeparatorClasses, buttonGroupTextClasses, buttonGroupVariants } from "./button-group.styles";

/*===== Button Group =====*/

/**
 * Related keys seated side by side in one slot. Its children may be `Button`s or anything styled with
 * `buttonVariants` (a `Link`); they drop their own cut. Give it an `aria-label` when the keys need a name as a set.
 */
function ButtonGroup({
  className,
  orientation,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      // A fieldset would add form-grouping semantics and UA styles to a row of keys.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

/*===== Text =====*/

function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ className: cn(buttonGroupTextClasses, className) }, props),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

/*===== Separator =====*/

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(buttonGroupSeparatorClasses, className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
