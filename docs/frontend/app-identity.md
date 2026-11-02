# App Identity: Mood, Tone & Theme

Tofang looks like a piece of hardware on a desk: a sampler-style instrument (Teenage Engineering EP–133 K.O. II is the
reference) on which the team runs its work. The page is the desk, each board column or panel is a housing, and every
control is a keycap seated in a machined cut. What the product does is in [app.md](../app.md); this doc is how it
looks and talks.

## Mood

- **Instrument**: every control is a physical part with a cut, a cap, and a press. Nothing is a floating flat
  rectangle; if a part can't be explained as something you could machine or mould, it doesn't belong.
- **Dense and legible**: small printed markings, compact keys and mono readouts, like a front panel. Density never
  goes below 12px text or 40px tap targets (Constraints).
- **Signal, not decoration**: colour only means something. Most of the surface is grey plastic; orange, yellow, blue
  and green each light up for one reason (Theme → Signals).
- **Tactile**: keys sink when pressed and stay sunk when latched, LEDs light and blink. State is shown the way hardware
  shows it, before any text explains it.
- **Calm**: no gradients, glows only on lit LEDs, no soft floating shadows. Housings sit on the desk with a hard ledge.

## Tone (copy)

Persian is the reference copy; every other language carries the same tone in its own idiom, not a word-for-word
translation ([i18n.md](./i18n.md)).

- Short and plain, like labels printed on a device: «شروع», «مکث», «توقف», not «شروع زمان‌سنج این کار». Buttons are
  verbs; markings are nouns.
- Formal and warm when there are full sentences: address the reader as «شما» (in English: plain, polite, second
  person). The team is five people who trust each other: no warnings for the sake of it, no exclamation marks.
- Errors say what happened and what to do next, in one or two short sentences: «عنوان کار خالی است. یک عنوان
  بنویسید.»
- Persian digits and the Persian thousands separator «٬»; Jalali dates. These come from the locale through the
  formatting helpers, never typed into a message. Task codes (`TD-42`), shortcuts, timers, phone numbers, e-mail
  addresses and URLs are set `dir="ltr"` in every language, and codes and timers print in the mono face.
- Product words, used the same way everywhere: کار (task), تخته (board), ستون (column), مالک (owner), مسئول
  (assignee), واگذاری (delegation), وابستگی (dependency), مسدود (blocked), زمان صرف‌شده (time spent).

## Brand

- **Name**: Tofang (تفنگ). The name prints in the header in `font-heading`, like a model name on a device.
- **No imagery.** (The housing's grain is a material, not an image.) The instrument is the brand: the grey housing, the one orange key, the square LEDs and the dark
  display glass. Icons are Lucide at a light stroke; avatars are keycaps with an initial.
- **References**: the approved design study is in `docs/frontend/reference/` (the rr8 showcase source, its tokens
  and screenshots). It's reference only: compare against it, never import from it.

## Theme

- Use the theme's Tailwind classes (`bg-card`, `text-muted-foreground`, `text-h2`…), never raw hex or the Tailwind
  palette. A new colour or type style is declared in `src/styles.css` first.
- Token names follow shadcn so the primitives keep working. **Naming trap**: the call to action is `highlight` (the
  orange key, one per view); `primary` is the graphite function key for ordinary in-app actions; shadcn's `accent`
  is the quiet hover wash.
- **Dark mode** is the `.dark` class on `<html>` (the theme toggle): the graphite edition of the same instrument. Only
  materials and lighting change; sizes, radii and motion don't. Recolour through the tokens, never by theme in
  component code.
- Icons are Lucide. Their stroke width is set in `styles.css`; change it with a `stroke-*` class, not the `strokeWidth`
  prop.

### Materials

| Part            | Light                  | Dark            | Tokens                                      |
| --------------- | ---------------------- | --------------- | ------------------------------------------- |
| Desk (the page) | warm grey              | near-black      | `background`, `foreground`                  |
| Housing         | light grey, hard ledge | graphite        | `card`, `shadow-housing`, `rounded-housing` |
| Tray            | a step darker, sunk    | darker graphite | `tray`, `shadow-tray`                       |
| Cut (the void)  | near-black             | black           | `cut`, `shadow-cut`, `rounded-chassis`      |
| Light key       | pale grey              | mid grey        | `keycap`, `shadow-keycap`                   |
| Function key    | graphite               | darker graphite | `primary` / `keycap-graphite`               |
| Action key      | orange                 | orange          | `highlight`, `shadow-keycap-highlight`      |
| Field plate     | off-white              | dark grey       | `field`, `shadow-field`                     |
| Display glass   | dark in both themes    |                 | `glass`, `glass-foreground`, `shadow-glass` |

Housings are matte moulded plastic: `surface-grain` lays a fine grain tile (`--grain`, in `public/textures/`) over
their colour with soft-light, so it never shifts the colour or the text contrast; the dark edition uses a tile at half
the contrast. A tray is a shallow recess milled into a housing to seat modules (the board's columns hold their cards
in one). On graphite a black cut barely shows, so in dark the cut's rim catches the light: a faint lit edge all round
and a brighter lower lip.

The cut and the keycap don't share a radius on purpose: the cut is a near-square milled slot (`rounded-chassis`, 3px)
and the key is the moulded part that carries the rounding (`rounded-keycap`, 6px), so the void shows most at the
corners. Parts under 40px use the `-compact` pair (2px / 4px). How the parts are built is in
[components.md](./components.md#the-instrument-model).

### Signals

One meaning per colour, everywhere. A signal is an LED, a lit segment, or a cut that changes colour; it is never a
text colour on the housing (yellow and green can't reach 4.5:1 there).

| Signal | Token              | Means                                   |
| ------ | ------------------ | --------------------------------------- |
| Orange | `signal-action`    | action, recording, focus inside a field |
| Yellow | `signal-attention` | attention: blocked, invalid, over WIP   |
| Blue   | `signal-selection` | selected, the active tab or option      |
| Green  | `signal-positive`  | running, done, healthy                  |
| Grey   | `signal-off`       | the LED exists but is off               |

Blinking is reserved for live states (work under way, a blocked task) and stops under reduced motion. Text that needs
a status colour uses the `success` / `warning` / `info` / `destructive` text tokens and their `-surface` pairs.

### Type

- **Vazirmatn** (`font-sans`) for reading: task titles, descriptions, comments.
- **IBM Plex Sans Arabic** (`font-heading`) for everything printed on the instrument: headings, key legends,
  markings.
- **IBM Plex Mono** (`font-mono`) for codes, counts, shortcuts and timers, inside an isolate (LTR for codes). Plex
  Mono has no Persian digits, so Vazirmatn follows it in the stack and draws them. Counts and dates on a card print
  as readings, in full ink: muted grey is for the silkscreen that names them.
- Type styles are `text-<name>` in `styles.css` (`text-h2`, `text-body`, `text-marking`, `text-stat`…); keep the list
  in `cn` (`src/lib/utils.ts`) in step.

## Constraints

These come from the language and accessibility, not from taste, so they hold whatever the design:

- Persian needs tall lines: keep line heights generous and text at 12px or larger, markings included. The same type
  styles serve English.
- Both directions: the layout mirrors between Persian (right-to-left) and English (left-to-right), and
  forward-pointing icons point the way the text reads. The code rules are in
  [architecture.md](./architecture.md#language-direction-and-accessibility) and [i18n.md](./i18n.md).
- Text pairs at least 4.5:1; control edges, focus rings and large text at least 3:1. Check new colours in both themes.
  `muted-foreground` is for the housing only; on the desk use `foreground`.
- Every interactive element shows a visible keyboard focus. Keys draw the ring outside their cut; fields turn their
  cut orange. Status colours travel with an icon or a word, never colour alone. Movement respects
  `prefers-reduced-motion` (`motion-safe:` / `motion-reduce:`).
- Tap targets are at least 40px. Compact 32px keys are for dense rows (card footers, toolbars) where a larger target
  surrounds them or a full-size alternative exists.
