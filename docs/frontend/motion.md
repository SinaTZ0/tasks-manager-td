# Motion Inside a Page

Moving to another page fades and slides through the router's view transition ([view-transitions.md](./view-transitions.md)).
Everything that changes inside a page animates with CSS when CSS can follow the change, and with Motion
(`motion/react`) when it can't. Movement is short (about 150–250ms), and none of it plays under
`prefers-reduced-motion` ([app-identity.md](./app-identity.md) → Constraints).

| The change                                                                     | Animated with                                |
| ------------------------------------------------------------------------------ | -------------------------------------------- |
| Moving to another page                                                         | The router's view transition                 |
| A popup opening or closing (dialog, drawer, menu, popover, tooltip, toast)     | CSS, through Base UI's starting/ending style |
| A tab's panel, a hover, a pressed key, a panel that opens or folds             | CSS                                          |
| An item added to or removed from a list, a list filtered or reordered          | Motion                                       |
| A card moving to another column, content swapped for content of another height | Motion                                       |

No React `<ViewTransition>` and no `document.startViewTransition` inside a page: a view transition animates bitmaps
of the page, lifts its parts above every open modal and blocks clicks while it plays (view-transitions.md → Only
Between Pages).

## CSS

- **Popups** animate from Base UI's `data-starting-style` and `data-ending-style` attributes, in the primitive's
  `state` group (`sheet.styles.ts`, `dialog.styles.ts`). Base UI only plays the enter for a popup whose `open` changes
  while it is mounted: one that mounts already open appears at once, and one unmounted with its state vanishes. So
  keep the popup mounted and drive `open`, as the task drawer does with `?task=`
  (`src/routes/projects_projectKey/components/task-drawer.tsx`): it keeps the last task's content while it plays out.
- **Something that appears inside a mounted part** fades in with `tw-animate-css` classes (`animate-in fade-in-0`). A
  tab's panel only fades once a tab has been chosen (`data-switched` on the tabs root), so the first panel shown with
  the page doesn't.
- **Height** animates from a measured variable (`h-(--accordion-panel-height)` with Base UI's collapsible) or from a
  `grid-template-rows` transition between `0fr` and `1fr`.
- Put the classes behind `motion-safe:`; the reduced-motion block in `src/styles.css` also removes every transition.

## Motion

Use Motion only where CSS can't follow the change: elements that come and go from a list, and elements whose place
or size changes because the layout around them changed.

- **Exits**: wrap what can leave in `<AnimatePresence initial={false}>`, give each child a stable `key`, and set
  `exit`. `initial={false}` keeps the first render, server rendering and hydration still: only later changes animate.
- **Moves**: `layout` animates an element to its new place and size; `layoutId` (unique on the page, built from the
  record's id) carries it between two parents, a card from one column to another. Each `layout` element is measured
  on every render of its parent, so put it on what actually moves, not on everything.
- **Query data needs nothing special.** Motion animates the real element when React renders new data, whatever
  started the render: a refetch, a mutation's result or a search param.
- **Drag and drop**: an element dnd-kit is dragging must not have `layout` at the same time: both set its transform.
  Turn `layout` off while a drag is in progress.
- **Reduced motion**: Motion runs under one `<MotionConfig reducedMotion="user">` near the root, which turns
  transforms and layout animation off when the person asks for less motion.
