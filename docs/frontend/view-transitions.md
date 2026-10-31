# View Transitions (Page Fade and Slide)

Client navigations to another page fade between the old and new page, and the new content slides in from the side
that matches the direction: forward or back through history. The router starts the
[View Transition](https://developer.mozilla.org/docs/Web/API/View_Transition_API) itself, through
`defaultViewTransition` in `src/router.tsx`. Browsers without the View Transition API navigate as usual, without the
fade.

## How It Works

```ts
defaultViewTransition: { types: pageTransitionTypes },
```

- **The pathname decides what animates.** When a navigation changes the pathname, `pageTransitionTypes` returns the
  type `page` plus a direction, the router wraps its commit in `document.startViewTransition` with those types, and the
  whole document cross-fades. Anything that keeps the pathname (a new search param, a hash, a refetch) gets `false` and
  updates instantly.
- **The history position decides the direction.** The router keeps its position in the history stack in
  `location.state.__TSR_index`. A higher index than the current page adds `page-forward`, a lower one (Back, or
  `history.go(-n)`) adds `page-back`. A `replace` to another page keeps the index, so it gets the plain fade.
- Every client navigation qualifies: `<Link>`, `navigate()`, redirects from `beforeLoad`, and Back/Forward. Nothing
  needs to opt in.
- The fade starts after the loaders finish, when the new page is ready to render. It doesn't replace pending UI for
  slow loaders.
- Browsers that support view transitions but not transition types (`:active-view-transition-type()`) skip the
  `types` function, so every navigation fades there, search changes included.

| Navigation                                  | Animation                     |
| ------------------------------------------- | ----------------------------- |
| To another pathname (`/` → `/orders`)       | Fade, new page slides forward |
| Forward button to another pathname          | Fade, new page slides forward |
| Back button to another pathname             | Fade, new page slides back    |
| `replace` to another pathname               | Fade                          |
| Same pathname, new query or hash, a refetch | None                          |

- **Same route, new params remount.** `/orders/1` → `/orders/2` is a new pathname, so the page fades and mounts fresh,
  and its local state resets. That is usually what a different record should do.

### Why Not React's `<ViewTransition>`

React only animates updates that run inside a Transition. TanStack Router commits navigations inside
`React.startTransition`, but components read the location and matches through external stores
(`useSyncExternalStore`), and React always applies those updates synchronously. A page-level `<ViewTransition>` keyed
on the pathname therefore never activates on navigation, so the router's own option does the page fade.

### The Slide

Only the new page slides. The browser snapshots the old page before the router commits and the new one after, and the
router's `onBeforeRouteMount` event fires in between. `markEnteringPage` in `src/router.tsx` sets
`data-page-entering` on `<html>` there, which gives `#main` the `view-transition-name` `page`, so `#main` has its own
snapshot in the new state only:

- The old page fades out whole, as part of `root`, which is the size of the viewport.
- The new header and footer fade in with `root`; the new `#main` fades in while moving `--page-shift` (2rem) in from
  one side.
- Forward points left in RTL (`app-identity.md`), so a forward page arrives from the left and a back page from the
  right. `--page-shift` is negative under `dir="rtl"` and positive otherwise, so an LTR page gets the mirror image.

Naming `#main` in both states would slide the old content out too, but the browser then moves each snapshot from its
old box to its new one. Forward navigation resets the scroll and Back restores it, so whenever the two pages sit at
different scroll positions, both pages would glide up or down across the screen.

## Styling

- The durations live in `styles.css`: `root` for the fade, `::view-transition-new(page)` for the slide. They are kept
  short because the page ignores clicks while the animation runs.
- `prefers-reduced-motion: reduce` turns the animation off, so navigation is instant.
- The header and footer are part of the `root` snapshot. They look the same on both pages, so the cross-fade keeps
  them visually steady.
- To style only page navigations, scope rules with `:active-view-transition-type(page)`; for one direction, with
  `page-forward` or `page-back`.

## Only Between Pages

View transitions animate moving from one page to another, and nothing else. Changes inside a page animate with CSS or
Motion ([motion.md](./motion.md)): don't put React's `<ViewTransition>` in a page, and don't call
`document.startViewTransition` for an in-page change. A view transition animates bitmaps of the page, so round ends
stretch, named parts are drawn above every open modal, the page ignores clicks while one plays, and a second one cuts
the running one off. React also only starts one inside a Transition, and query and mutation data never arrive in one.

- **Morph an element between pages:** give it the same `view-transition-name` on both pages, built from the record's
  id (`note-42`), since a name must be unique on the page. The page fade then animates that element from its old box
  to its new one.
- The board's head panel fold (`src/lib/board-panel.ts`) is the one in-page view transition left, and is moving to
  a CSS height transition ([motion.md](./motion.md)).

The `react-view-transitions` skill (`.agents/skills/`) has how to change the page fade and check it frame by frame.

## Don'ts

- Don't call `document.startViewTransition()` around a navigation: a second view transition skips the first.
- Don't pass `viewTransition` to a `<Link>` or `navigate()`. It replaces the default for that navigation, so the page
  loses its direction and the search-param rule.
- Don't add `@view-transition { navigation: auto; }`. It only affects full page loads between documents, not client
  navigations.

## iOS Swipe-Back

**Test the iOS swipe-back gesture on a real device.** iOS plays its own animation for a swipe back, and the page then
fades and slides too, which can look like a double animation. If it shows up, skip the fade when the browser already animated,
which `PopStateEvent.hasUAVisualTransition` reports.
