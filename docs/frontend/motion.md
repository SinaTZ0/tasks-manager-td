# Motion Inside a Page

Moving to another page fades and slides through the router's view transition ([view-transitions.md](./view-transitions.md)).
Everything that changes inside a page animates with CSS when CSS can follow the change, and with Motion
(`motion/react`) when it can't. Movement is short (about 150–250ms), and none of it plays under
`prefers-reduced-motion` ([app-identity.md](./app-identity.md) → Constraints).

| The change                                                                 | Animated with                                |
| -------------------------------------------------------------------------- | -------------------------------------------- |
| Moving to another page                                                     | The router's view transition                 |
| A popup opening or closing (dialog, drawer, menu, popover, tooltip, toast) | CSS, through Base UI's starting/ending style |
| A tab's panel, a hover, a pressed key, a panel that opens or folds         | CSS                                          |
| Dragging and dropping a board card or column                               | dnd-kit's own animation, nothing added       |
| A filter hiding or showing a board card                                    | CSS, `fold-away`                             |
| An item added to or removed from a list, a list filtered or reordered      | Motion                                       |
| Content swapped for content of another height                              | Motion                                       |

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
  `grid-template-rows` transition between `1fr` and `0fr` around a `min-h-0` box.
- **Width** of a part with a known width animates between lengths, as the board's sidebar shrinks to its strip of
  icons (`primitive/sidebar/sidebar.styles.ts`): keys narrow with it and cut their labels off, and what has no icon
  keeps its width while it fades, so nothing rewraps on the way. Turn what fades `invisible` at the end, so its controls
  leave the tab order.
- **A board filter** folds cards instead of removing them (`fold-away` in `src/styles.css`, `data-folded` on the list
  item): they stay mounted, fade as their row closes, and open again when the filter lets them back. Only a filter
  changes `data-folded`, and a filter stops drags, so this never runs during one. The column's empty bay folds the same
  way, and holds still while something is dragged.
- Put the classes behind `motion-safe:`; the reduced-motion block in `src/styles.css` also removes every transition.

## Motion

Use Motion only where CSS can't follow the change: elements that come and go from a list, and elements whose place
or size changes because the layout around them changed. The board's cards and columns are not among them: dnd-kit
animates a drag and the list making room for it, and nothing else is added to them.

- **Exits**: wrap what can leave in `<AnimatePresence initial={false}>`, give each child a stable `key`, and set
  `exit`. `initial={false}` keeps the first render, server rendering and hydration still: only later changes animate.
- **Moves**: `layout` animates an element to its new place and size; `layoutId` (unique on the page, built from the
  record's id) carries it between two parents. Each `layout` element is measured on every render of its parent, so
  put it on what actually moves, not on everything.
- **Query data needs nothing special.** Motion animates the real element when React renders new data, whatever
  started the render: a refetch, a mutation's result or a search param.
- **Reduced motion**: Motion runs under one `<MotionConfig reducedMotion="user">` near the root, which turns
  transforms and layout animation off when the person asks for less motion.
