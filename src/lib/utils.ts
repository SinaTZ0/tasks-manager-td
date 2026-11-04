import { createCn } from "cn/config";

/**
 * Joins class names and resolves Tailwind conflicts (the last class wins).
 *
 * The merge must know the app's type styles (`--text-<name>` in `src/styles.css`): left unknown, `text-h1` reads as a
 * text colour, and `cn("text-h1 text-primary")` would drop the type style. Keep this list in step with `styles.css`.
 */
export const cn = createCn({
  extend: {
    // Custom spacing, tracking and radius steps from `src/styles.css`: without them `inset-0 inset-press` keeps both
    theme: {
      spacing: ["cut", "cut-compact", "press", "press-compact"],
      tracking: ["marking", "readout"],
      radius: ["chassis", "chassis-compact", "keycap", "keycap-compact", "housing"],
    },
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "stat",
            "readout",
            "h1",
            "h2",
            "h3",
            "h4",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "button",
            "kicker",
            "nav",
            "marking",
          ],
        },
      ],
    },
  },
});
