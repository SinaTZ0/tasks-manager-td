---
name: react-view-transitions
description: How this app's page navigation animates with the browser View Transitions API (the router's page fade and directional slide, and morphing an element between two pages), and how to change or verify it frame by frame in headless Chromium. View transitions are for moving between pages only; changes inside a page use CSS or Motion (docs/frontend/motion.md), never React's <ViewTransition> or document.startViewTransition. Use when changing the page fade or slide, when an element should morph from one page to the next, when the user mentions view transitions, ViewTransition, startViewTransition, defaultViewTransition or the page animation, or when someone proposes a view transition for an in-page change (redirect them to motion.md).
---

# View Transitions (Between Pages Only)

The app animates moving from one page to another with the browser's View Transitions API, started by the router
(`defaultViewTransition` in `src/router.tsx`). How it works, and what animates when, is in
`docs/frontend/view-transitions.md`. This skill is how to change it and how to check it.

**Not for in-page changes.** A list that changes, a card moving to another column, a form swapped for its receipt, a
panel that folds: those use CSS or Motion (`motion/react`), as `docs/frontend/motion.md` lays out. Don't add React's
`<ViewTransition>` to a page, `addTransitionType` for an in-page change, or a `document.startViewTransition` call. The
app tried that (an unpushed commit, dropped on 2026-10-31) and it was mostly workarounds: typed transitions so
hydration and the router's commits didn't animate, holding query data in local state to set it inside a Transition,
waiting for the router and for open modals (named parts are drawn above them), fixing stretched snapshots, and the page
ignoring clicks while one played.

## Ground Truth for This Repo

- The router starts the transition on every client navigation. `pageTransitionTypes` gives the types `page` plus
  `page-forward` or `page-back` from the history index, and `false` when the pathname doesn't change, so search params,
  hashes and refetches update instantly. `markEnteringPage` sets `data-page-entering` on `<html>` between the old and
  new snapshots, which names `#main` `page` in the new state only.
- The rules live in `src/styles.css` → `/*===== Motion =====*/`: the 200ms `root` cross-fade, `--page-shift` (2rem,
  negative under `dir="rtl"`) and the `page-in-forward` / `page-in-back` keyframes. Reduced motion sets
  `animation: none !important` on every `::view-transition-*` pseudo-element; keep it.
- The app is **Persian first (RTL) with English (LTR)** at `/en/...`. Forward points left in RTL. Directional motion is
  built from a variable that flips with the direction, never fixed left/right.
- React is 19.3, where `<ViewTransition>` is stable, but it does not animate navigation: the router's location and
  matches reach components through `useSyncExternalStore`, which React always applies synchronously. That is why the
  router's own option runs the fade.

## Changing the Page Animation

- Style through the types: `:root:active-view-transition-type(page-forward)::view-transition-new(page)`. Scope any new
  rule to `page`, `page-forward` or `page-back`, so it can't apply to a transition started for anything else.
- Keep it short (about 200ms): the page ignores clicks while it runs.
- Don't pass `viewTransition` to a `<Link>` or `navigate()`: it replaces the default for that navigation, so the page
  loses its direction and the search-param rule.
- Don't call `document.startViewTransition()` around a navigation: a second view transition skips the first.
- Don't add `@view-transition { navigation: auto; }`: it only applies to loads between documents.

## Morphing an Element Between Pages

Give the element the same `view-transition-name` on both pages, built from the record's id (`note-42`), since a name
must be unique on the page. The page fade then animates it from its old box to its new one. Name it only on the pages
involved, and scope the rule to the `page` type so it isn't captured by anything else.

## Pitfalls

- **Names must be unique** among the elements captured in one transition. The router names `#main` `page`; don't reuse
  it.
- **Snapshots are images.** Text in a named group cross-fades between old and new, and a changing aspect ratio
  stretches it: a rounded fill that changes width smears its ends. For a plain shape, hide the images and paint the
  group, with a literal colour or a `:root` variable (the pseudo-elements hang off `<html>`).
- **Scroll.** Naming `#main` in both states would slide the old page too, and whenever the two pages sit at different
  scroll positions both would glide up or down. That is why only the new page is named.
- **Groups stack in the old state's paint order.** Give what must stay on top `z-index: 1` inside a parent with
  `isolation: isolate`.
- **Groups sit on whole pixels.** With a fractional height the edge jumps 1px when the animation hands back.
- **The RTL overlay.** If the root ever stops cross-fading and the page vanishes in Persian only, the UA's `inset: 0`
  has put the overlay a viewport-width off-screen: pin it with `::view-transition { inset: 0 auto auto 0; }`.
- **iOS swipe-back** plays its own animation first; if the double animation shows on a real device, skip the fade when
  `PopStateEvent.hasUAVisualTransition` is true.

## Verifying

A transition can "pass" (the page changes, no errors) while drawing nothing or drawing it wrong. Look at frames
**mid-animation** and at the hand-off, in both languages. Playwright is a dev dependency (`@playwright/test`); its
Chromium comes from `pnpm exec playwright install chromium`, which you ask the user before running. Put the script in
`.tmp-claude/` (it resolves the repo's packages from there) and run it with `node` against `pnpm dev`. Stop the dev
server afterwards.

**Record and freeze every transition.** Wrap `document.startViewTransition` before the page loads, so you can count
the transitions, see what started them, and pause them to step through:

```js
await page.addInitScript(() => {
  window.__vts = [];
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = (arg) => {
    const vt = start(arg);
    const record = { step: window.__step, scrollAtStart: scrollY };
    window.__vts.push(record);
    vt.ready.then(() => {
      record.scrollAtReady = scrollY;
      if (window.__pause) document.getAnimations().forEach((a) => a.effect.pseudoElement && a.pause());
    });
    vt.finished.then(() => (record.scrollAtEnd = scrollY));
    return vt;
  };
});

// …navigate, wait for the record, then step through at fixed times:
for (const t of [0, 100, 200]) {
  await page.evaluate((t) => document.getAnimations().forEach((a) => a.effect.pseudoElement && (a.currentTime = t)), t);
  await page.screenshot({ path: `.tmp-claude/frame-${t}.png` });
}
```

A screenshot takes longer than a short animation, so screenshots of a running transition show the end state. Freeze
instead.

**Read where each group goes.** The group keyframes are the boxes the browser captured. A `to` position off-screen,
or different from the live element's final box, is a pop at the end:

```js
document.getAnimations()
  .filter((a) => a.effect.pseudoElement?.startsWith("::view-transition-group"))
  .map((a) => [a.effect.pseudoElement, a.effect.getKeyframes()[0].transform, a.effect.getKeyframes().at(-1).transform]);
```

Check:

1. **Only navigations start one**: none on page load, none for a search-param change, and only one per navigation.
2. The mid frames show the old page fading and the new `#main` sliding from the side the direction says.
3. **Both directions**: a link forward and Back.
4. The last frame matches the settled page: nothing moves, shrinks or crops when the live page takes over, and
   `scrollAtEnd` equals `scrollAtReady`.
5. `/en/...` (LTR) as well as the Persian page, and 390px as well as desktop width.
6. `reducedMotion: "reduce"` in the page options leaves no running `::view-transition*` animations.
