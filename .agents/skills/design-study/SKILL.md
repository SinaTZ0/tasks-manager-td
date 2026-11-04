---
name: design-study
description: How this project compares design directions before building one. Use whenever the user asks for an "EXAMPLE STUDY" ("give me 4 EXAMPLE STUDY", "a study for the footer"), for several designs or options for a part of the site ("give me 4 different designs for X", "like you did with the hero"), for more options in a running study ("give me four more"), or for versions of one option ("give me three other versions of option 2"). Produces a gitignored study route at /design-study/<topic> built from the real components and live data, with the current design as option 0, a study bar with notes per option and checked screenshots, then builds only the option the user picks and removes the study's files, keeping its screenshots. Never changes the app for a study and never publishes to claude.ai.
---

# Design Study

A design study answers "what should this part of the app look like?" by putting the current design next to a few real
alternatives the user can flip through, before any of them touches the app. Each study ends in a single build of the
chosen option. A study is a gitignored route: real components, real data, real popups and filters, opened at
`/design-study/<topic>`.

## Hard rules

- **Gitignored route only.** A study lives in `src/routes/design_study/<topic>/`. `src/routes.ts` finds it on disk, and
  `.gitignore` and `.dockerignore` keep it out of the repo and off the server. It exists only on this machine.
- **The app never imports from a study.** A study may import anything from the app; nothing in the app may know about
  it. No switch, flag, cookie or preview widget in tracked code: a variant switch spreads into primitives, props and
  CSS, and every later change has to be made once per variant.
- **No tracked file changes until the user picks.** A variant or token an option needs stays in the study folder (a
  `className`, a local component). Study-only words stay there too, never in `messages/*.json`: a tracked key would
  outlive the study. Real messages are fine to read with `m.*`.
- **Local only.** Never use the Artifact tool or Claude Docs for a study, never open anything on claude.ai.
- **Real content.** Use the live page's real data, Persian first. Placeholder text hides the very problems the study is
  for (long Persian titles, many columns, a long name in a narrow key).

## 1. Find the actual problem

Before drawing anything, look at the current design and work out what is wrong with it. Write it down in one or two
sentences; it becomes the first thing in your reply.

- Screenshot it and measure what you can in Playwright: heights, where the content starts, key baselines, edges that
  should line up, title lengths, how many items a list has. A number beats an impression.
- Read `docs/frontend/app-identity.md` and look at the app's most finished parts: options should feel like this app,
  its materials and motifs, not like a generic template.

## 2. Choose the options

The default is **four** options, numbered 1–4 after the current design (0). They must differ in **concept**, not in
colour or radius. Good studies have spread across:

- the safe fix: the smallest change that solves the problem, and that looks like the rest of the app;
- one that leans hardest into the app's identity;
- one that changes the structure (a list instead of cards, a rail, a band);
- one that is bold, with its risk named honestly.

For each option write: a name of one to three words, a lead saying what it is and why, and three lists: **Good**,
**Watch** (real risks: hidden content, text covered, dark mode, a long name) and **Build** (what it would cost in this
codebase: which components, primitives and tokens, and any backend change).

## 3. Build the route

```text
src/routes/design_study/<topic>/      # folder name with `_`; URL and file name with `-`
  design-study-<topic>.tsx            # the route: loader, the page, the study bar
  options.tsx                         # one component per option; option 0 is the current design
  parts.tsx                           # what the options share
  notes.ts                            # the options' notes
  study-bar.tsx                       # copy of assets/study-bar.tsx
```

- The route's id is `/_site-layout/_app-layout/design-study/<topic>`, so it is signed in and has the real header.
- **Restart the dev server after adding or removing a study folder.** It reads `src/routes.ts` once at startup, and
  until then it rewrites `routeTree.gen.ts` without the study and answers 404. Kill the PID on :3000, then
  `(nohup pnpm dev > .tmp-claude/dev.log 2>&1 &)`.
- Keep the option in the URL (`?opt=2`, `z.number().int().optional().catch(undefined)`), extending the page's own search
  schema, so filters and other state keep working and a view can be linked.
- Reuse the page's real wiring: the same loader, queries and components. Copy into the study what the option must
  reshape; option 0 is the live component, or a copy of it when the page writes it inline.
- Keep the page's surroundings, so each option is judged in place.
- Write with Tailwind classes, so a picked option moves to `src/` nearly as it is. `@source` in `src/styles.css` scans
  the study folder, which Tailwind would otherwise skip as gitignored; it can only reach it by that literal path, which
  is why this is the one nested folder under `src/routes/`.
- Language, theme and width are the app's own: the header's keys and the browser window. No toggles to build.
- When colour tells kinds apart (dates in a calendar, series, statuses), pick the hues with the `dataviz` skill's
  validator, not by eye, check each ink's contrast on its tint, and give every kind a second cue (a shape, a label).

## 4. Check it before handing over

`oxlint` and Prettier skip gitignored files, so run `pnpm exec tsc --noEmit`, which covers the study. Then copy
`scripts/shoot-study.mjs` to `.tmp-claude/<topic>-study/` and shoot every option. Look at every image yourself. At the
least, check every option in Persian light, and the new ones in English dark. Press the real keys with Playwright too
(open a popup, set a filter), and watch for page errors. Fix what you find: overflow, uneven columns, a rule running
past its column, a dark surface that disappears. Report anything you could not fix.

## 5. Hand over

Reply in a few short paragraphs:

1. the problem, in one or two sentences;
2. one short paragraph per option: what it is, what's good, what to watch;
3. your honest pick and why, and the safe alternative if it differs; ask which one to build;
4. last of all, the URL to visit (`http://localhost:3000/design-study/<topic>`), and that keys 0–4 pick and `n` opens
   the notes. The URL always ends the reply, one per study, so it is never lost above the notes. Any later reply about
   the study (new options, a fix, a built pick) ends with the URL to look at too.

Record the study in memory: the topic, the options and that the pick is pending.

## Follow-ups

- **"Give me four more"**: add options 5–8 to the same route, with the same notes and checks. Recommend across all of
  them, not only the new ones.
- **"Give me N other versions of option K"**: add them as further options named `Kb`, `Kc`. Variations should still
  differ in idea within K's family, not only in spacing.
- **"Mix 3 with the band from 8"**: make it a new option built from the closer one, and say what it borrows.

## Building the pick

Once the user picks, build only that option in `src/`, following `docs/frontend-flow.md`:

- Move the option's code out of the study. Nothing tracked may import from `src/routes/design_study/`.
- Change the primitives and `src/styles.css` where the design needs it (a variant, a token) instead of bending the
  design to fit them, and add or update the primitive's story. Study-only words become real messages in both languages.
- Delete what the old design leaves unused: components, message keys in both `messages/*.json`, tokens.
- Run `pnpm lint`, and `pnpm typecheck` when props or contracts changed.
- Remove the study, as below, now that its code has moved out.
- Screenshot the real page, waiting for hydration.
- End the reply with the URL of the real page the pick landed on.
- Commit and push only when the user says so. commitlint caps body lines at 100 characters.
- Update the study's memory note with the outcome and the commit.

## Removing a study

A study ends when the user picks: once the pick is built, or when they drop the study without one. Don't wait to be
asked. A finished study still costs something: `tsc` keeps checking it, so a later refactor can fail over code nobody
uses, and `git status` never shows it.

1. Make sure `.tmp-claude/<topic>-study/shots/` has every option, option 0 included, and shoot any that are missing:
   the screenshots are what's left of the study, and `.tmp-claude/` is where they stay.
2. `rm -rf src/routes/design_study/<topic>`, then restart the dev server. Nothing else to clean up: no tracked file names
   it.
3. Say in the reply that the route is gone and where the screenshots are.

## Pitfalls

- A study is gone on a fresh clone and can't be shared by link: it lives only on this machine. Its screenshots are in
  `.tmp-claude/<topic>-study/shots/`.
- `git status` won't show a study, so nothing reminds anyone it exists. `ls src/routes/design_study` does.
- Keep the study bar's keys off anything the page already uses, and keep page padding below its height.
- Content that isn't translated (a Persian column name on the English page) needs `dir="auto"` in a new part.
