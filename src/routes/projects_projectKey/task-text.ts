import type { LabelColor } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Task Words =====*/
// Message functions, not their text, so each request gets its own locale.

const LABEL_COLOR_NAMES: Record<LabelColor, () => string> = {
  slate: m.label_color_slate,
  purple: m.label_color_purple,
  pink: m.label_color_pink,
  brown: m.label_color_brown,
  teal: m.label_color_teal,
  navy: m.label_color_navy,
};

/** A label colour's name, for the colour picker's keys. */
export function labelColorName(color: LabelColor): string {
  return LABEL_COLOR_NAMES[color]();
}

/** The swatch class of each label colour. Written out whole so Tailwind finds them. */
export const LABEL_SWATCH: Record<LabelColor, string> = {
  slate: "bg-label-slate",
  purple: "bg-label-purple",
  pink: "bg-label-pink",
  brown: "bg-label-brown",
  teal: "bg-label-teal",
  navy: "bg-label-navy",
};
