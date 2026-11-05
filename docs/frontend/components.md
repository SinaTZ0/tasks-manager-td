# Component Conventions

## Where Components Live

- `src/components/primitive/` holds this app's versions of shadcn components. Every shadcn component the app uses
  lives here, restyled or not. Each one owns its folder:

  ```text
  primitive/button/
    button.tsx          # rendering and props
    button.styles.ts    # style groups and CVA variants
    button.stories.tsx  # maintained UI documentation
  ```

- `src/components/primitive/` also holds the instrument's own atoms, parts with no shadcn original that the design
  system is built from and that other primitives use: `led`, `display`, `marking` and `hold-key`. They follow the same folder
  layout. A component belongs here only if it is a generic part of the instrument; anything that knows about tasks,
  boards or users (a task card, a priority mark) is app-made and lives in a route slice or `shared/`.
- `src/components/ui/` holds the untouched shadcn source, with every component installed. Never edit it and never
  import from it. It exists so that shadcn updates show up as a git diff (see
  [Reviewing a shadcn Update](#reviewing-a-shadcn-update)), and as the source to copy when creating a primitive. Docs
  for each component are at `https://ui.shadcn.com/docs/components/<name>`.
- `src/components/shared/` holds app-made components used by more than one route: things with no shadcn original, such
  as `form-alert`, `site-link`, `media-image` and `theme-toggle`. Same one-folder-per-component layout, with a
  `<name>.styles.ts` only when the component has its own style map, and a story for anything visible.
- Route-specific pieces stay in their route slice and move to `shared/` when a second route needs them; see
  [architecture.md](./architecture.md).

Import directly from the owning file. `buttonVariants` and other CVA helpers come from the `*.styles.ts` file.

## Creating a Primitive

1. Copy the `ui/` file into `primitive/<name>/<name>.tsx`. Leave the `ui/` file as it is.
2. Move its classes into `<name>.styles.ts` as `defineStyles` groups (see below), restyling as the design needs.
   Replace shadcn's English built-in text (`sr-only` labels, `aria-label`s like «Close») with `common_*` messages
   ([i18n.md](./i18n.md)), and its physical classes with logical ones.
3. Keep shadcn's exports, props, parts and `data-slot` / `data-*` attributes, so shadcn's docs and future updates still
   map onto it.
4. If it composes other shadcn components, import their primitives, creating them first if they don't exist.
5. Add `<name>.stories.tsx`.

## Changing a Primitive

Change base styles, add variants or remove them whenever the design calls for it. A primitive is shared, so first check
its consumers and the primitives that compose it, since some rely on its slots and selectors (`data-slot`,
`in-data-[slot=button-group]`, `has-data-[icon=…]`, `aria-invalid`). Then update the story.

## Reviewing a shadcn Update

Update the shadcn source with the CLI (`pnpm dlx shadcn@latest add --all --overwrite`), then review the diff. The CLI
can also rewrite `src/styles.css` and `src/lib/utils.ts` (`cn`): keep the app's tokens, and treat a changed helper like any
other change worth porting.

For each changed component in `git diff src/components/ui/` that has a primitive, decide whether the change is worth
porting (a new `data-*` attribute, an accessibility fix, a new helper or dependency) and port it into the primitive by
hand. Commit the `ui/` update even when nothing is ported, so the next diff starts from it.

## The Instrument Model

Every part is drawn as hardware ([app-identity.md](./app-identity.md#materials)). The recipe lives in
`primitive/instrument.styles.ts`; build new pressable or seated parts from it instead of restyling by hand.

- **Cut**: the machined hole, painted on `::before` at `z -2`, larger than the part by the cut gap (`-inset-cut`,
  3px; `-inset-cut-compact`, 2px), near-square (`rounded-chassis`), near-black with the cut's shading (`shadow-cut`).
  It sits outside the part's box, so it never changes layout: give neighbouring parts at least `gap-2`.
- **Keycap**: the moulded face, painted on `::after` at `z -1` with its material and bevel. The element itself is
  transparent and `isolate`, so both pseudo-elements stack behind its content. **Never give a part's root a
  background**: the cut paints over it. Put colour on `::after`.
- **Press**: the face shrinks inside the cut (`after:inset-press`) and darkens, with the pressed inner shadow. It never
  translates: a key that moves down slides over the lower gap. Momentary parts sink on `:active`; latching parts
  (Toggle, Tab, Checkbox) hold the sunk state through `data-pressed`, `data-checked` or `data-active`.
- **Scale**: `regular` for parts 40px and up, `compact` below. Compact scales the radius, bevel, cut width and press
  depth together; a full-size bevel floods a 32px face.
- **Tone**: `light` (pale key), `graphite` (function key, `primary`), `highlight` (the orange key), `danger`, `flat`
  (a plate flush with the housing). Button maps its shadcn variants onto these; `ghost` and `link` have no cut, and neither do `glass` and `glass-cap`, the parts of the header's display glass.
- **Slot**: one long cut holding several parts (toggle group, tab list). The slot's background is the void and its
  padding is the gap; parts inside hide their own cut (`before:hidden`).
- **Field**: inputs and textareas can't have pseudo-elements, so they render a wrapper that carries the cut and the
  plate (`bg-field shadow-field`); the consumer's `className` (layout only) goes on the wrapper. Focus turns the cut
  orange (`cut-focus`), invalid turns it yellow.
- **Focus**: keys draw the ring outside the cut (`outline-offset-4`, `-3` compact), so it never hides the void.
- **Disabled**: the face goes grey and dim, the legend muted; the cut stays, because the part is still there.
- **Housings and popups**: `bg-card` (or `bg-popover`), one thin border, `rounded-housing`, `shadow-housing` (a hard
  ledge, no blur). Popups lift with `shadow-md`.
- **Markings**: text printed on a housing uses `markingClasses` (words), `readoutClasses` (codes, in mono and LTR)
  or `readingClasses` (a value the part shows, such as a count, a date or time spent: mono in full ink, in its own
  direction), or the `Marking` primitive (`variant="code"`, `variant="reading"`).

Stories render on a housing panel (the `withHousing` decorator in `.storybook/preview.tsx`), because that is where
parts live. A story of a housing or a popup opts out with `parameters: { housing: false }`.

## Style Maps

Wrap style maps in `defineStyles` from `primitive/styles.ts`. It keeps the classes split into named groups, keeps
their keys typed for CVA, and lets Prettier sort the Tailwind classes inside it. It does no merging at runtime.

```ts
const twVariant = defineStyles({
  default: {
    appearance: "bg-primary text-primary-foreground",
    hover: "hover:bg-primary/80",
  },
});
```

Use the shared group names (from `primitive/styles.ts`) and leave out the ones you don't need; unknown names fail
type-checking. A group with a distinct sub-concern can take a capitalized suffix, e.g. `stateAutofill`.

| Group                      | Contents                                                   |
| -------------------------- | ---------------------------------------------------------- |
| `layout`                   | Display, alignment, positioning, gaps, and `group/*` names |
| `geometry`                 | Dimensions, padding, margin, radius, and border width      |
| `typography`               | Font family, size, weight, alignment, and line height      |
| `appearance`               | Colors, border colors, shadows, and placeholder colors     |
| `interaction`              | Transitions, cursor, selection, and pointer behavior       |
| `hover`, `focus`, `active` | Styles belonging to each interaction state                 |
| `disabled`, `invalid`      | Disabled and `aria-invalid` styles                         |
| `state`                    | Open/closed, expanded, and enter/exit styles               |
| `motion`                   | Reduced-motion overrides                                   |
| `icon`                     | Selectors affecting descendant icons                       |

- `joinStyles(groups)` turns one set of groups into a class string, both for a part without variants and for a CVA base.
- `composeStyles(map)` turns a map of variant options into CVA's `variants` and keeps the option keys literal.
- Resolve Tailwind conflicts only at the element: `cn(componentVariants({ variant, size }), className)`.
  Import `cn` from `#/lib/utils`, never from the `cn` package (lint enforces it): the app's copy knows the type styles,
  and without them `cn("text-h1 text-primary")` reads both as colours and drops the type style. A new `--text-<name>`
  in `src/styles.css` goes into its list too.
- Export the variant maps as `twVariant`, `twSize`, and so on, so stories build their controls from them
  (`Object.keys(twVariant)`).

## Lint Rules

`pnpm lint` runs [`@shadcn/lint`](https://github.com/shadcn-ui/lint) (configured in `.oxlintrc.json`):

- `no-restyle`: outside `primitive/`, a primitive's `className` may only hold layout (margin, width, flex and grid
  placement). A different look belongs in the primitive, as a variant or a changed base style.
- `no-raw-colors`: use theme colors from `src/styles.css`, not the Tailwind palette (`bg-pink-500`).
- `no-arbitrary-values`: stay on the scale (`w-88`, not `w-[22rem]`), or add the value to `styles.css` as a token.
- `no-inline-styles`: put dynamic values in a CSS custom property and read them from a class, as `media-image` does:
  `style={{ "--placeholder": url }}` with `bg-(image:--placeholder)`.

The linter can't read `defineStyles` maps, so keep primitive styles on theme tokens by hand. Fix a lint error by
changing the code it points at (the primitive, the parent's layout, or the theme), not by hiding the styling in a
wrapper element or a raw element. If a rule is genuinely wrong somewhere, disable it on that line with a comment saying
why.
