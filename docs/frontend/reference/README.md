# Design Reference

The approved design study Tofang's look comes from: a showcase page built in an earlier prototype (rr8, React Router
8) and refined with the user until the keycap, cut and press felt right. Reference only: never import from here.
Typecheck, lint and Prettier skip this folder.

- `rr8-showcase/showcase2.tsx`: the page. A working task deck (timer, status pads, priority, estimate fader,
  start/pause/stop wired to the rules in `docs/app.md`), a parts catalog, and a three-column board.
- `rr8-showcase/components/`: the parts. `instrument.recipes.ts` is the recipe that became
  `src/components/primitive/instrument.styles.ts`; `task-card.tsx` is the approved task card for when the board is
  built.
- `rr8-showcase/tokens.css`: the prototype's tokens. `src/styles.css` carries the same values under the template's
  names (`--surface-keycap-well` → `--cut`, `--primary` orange → `--highlight`, `--surface-display` → `--glass`…).
- `screenshots/`: the page in light, dark, the deck close up, and a phone width.

Decisions the user made along the way, which the primitives keep:

- The black ring around a key is the machined gap the key doesn't fill, not a border; it has no outer drop shadow.
- A press shrinks the key inside its cut; it never translates over the lower gap.
- The key carries the rounding (6px) and the cut is near-square (3px); compact keys scale both (4px / 2px).
- Small keys have their own bevel and press depth; full-size proportions look wrong on a 32px key.
