# Task Manager: Build Plan

How Tofang goes from the empty board to the MVP in [app.md](./app.md). Each slice is built end to end, backend first
([backend-flow.md](./backend-flow.md)), then the page ([frontend-flow.md](./frontend-flow.md)), and is usable when it
lands. Tick a slice off here when it is committed. Entities are described by what they are for and the rules they
keep; the columns are decided when each slice is built.

## Decisions

Made with the user on 2026-10-30. They answer the spec's open questions and override it where they differ.

- **Accounts**: there is no public sign-up. An admin creates every account, and the person signs in with the password
  the admin set.
- **Roles**: `admin` and `user`. An admin can promote anyone to admin and demote an admin to user. The last active
  admin can't be demoted or deactivated, so the team is never locked out.
- **Leaving the team**: deactivate (the existing `blocked` status), never delete. A deactivated user can't sign in and
  can't be assigned new work; their cards, comments and name stay.
- **Projects**: one board per project. Only an admin creates a project and chooses its members. A member sees only the
  projects they belong to; an admin sees every project. "Project" is the thing, "board" is how it is shown; code and
  copy say project (پروژه), and the board view keeps the word board (تخته).
- **Delegation** is accepted automatically.
- **Blocked cards**: moving one into a doing or done column is refused, unless the person forces it and writes a
  comment saying why (rule 4). No setting.
- **Notifications**: in-app only for now.
- **Hosting**: self-hosted, as the template already deploys (Docker Compose, Caddy).
- **Task codes** (`TD-42`) come in the first task slice, not later: each project has a short key the admin picks
  (`TD`) and its own counter, and a code never changes or gets reused.
- **Rich text is Tiptap**: task descriptions and comments are written in a Tiptap editor (toolbar, lists, links,
  @mentions through its mention extension). Bundle size doesn't matter much: almost every page is behind sign-in and
  used all day. A document is stored as Tiptap's JSON, so a mention keeps the user's id and survives a rename, plus a
  plain-text copy for search and for readable Activity entries. Read-only text is drawn with Tiptap's static renderer,
  so it is in the server-rendered page too.
- **Notes stay**: the template's notes become a personal notebook. Each person sees only their own notes, as the
  procedures already enforce. The `note` feature is no longer "the example to delete".

### Rules That Follow From Them

- **One column per kind.** Every project starts with the seven kinds (backlog, todo, doing, paused, review, done,
  cancelled) and keeps exactly one column of each, so "Pause → the Paused column" always has one answer. Columns can
  be renamed, reordered and given a WIP limit; the cancelled column is never drawn on the board.
- **Project settings are admin-only**: members, columns, WIP limits. Labels can be added by any member, because tagging
  is part of everyday work.
- **Owner**: whoever creates a task owns it. The owner or an admin can hand ownership to someone else; delegation never
  does (rule 6).
- **Comments are soft-deleted**: a deleted comment leaves "comment deleted" in the thread, and its text stays in the
  Activity entry. Nothing is hard-deleted except an archived task, by an admin (rule 10).

## Libraries

Added in the slice that first needs them, versions checked against React 19 at install time.

| Library                                                                         | Slice | For                                                                          |
| ------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------- |
| `fractional-indexing`                                                           | 2     | Position keys for cards and columns, so a move writes one row                |
| `@dnd-kit/core`, `@dnd-kit/sortable`                                            | 3     | Dragging cards and columns, with keyboard dragging and Persian announcements |
| `@daypicker/react`, `@daypicker/persian`                                        | 2     | The due-date picker as a `calendar` primitive, with its Jalali calendar      |
| `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/static-renderer` | 2     | The rich-text editor and its read-only rendering                             |
| `@tiptap/extension-mention`, `@tiptap/suggestion`                               | 7     | @mentions in comments, with a picker built from the popover primitive        |

Not needed: a separate mentions library (Tiptap's covers it), a websocket library (in-app notifications refetch; oRPC can stream
later), a date library beyond what the day picker brings (`src/lib/locale.ts` formats dates and durations with
`Intl`), a graph library (cycles are one recursive query).

## Cross-Cutting Rules

Built once, in the slice that first needs them, and used by every procedure after.

- **Activity is written in the same transaction as the change.** One helper records who, what, before, after and when;
  a procedure that changes a project or task without calling it is a bug. The table is append-only: a database trigger
  refuses updates and deletes, so no code path can edit history. An entry keeps a snapshot of what it needs to read
  well later (the task's code and title, a column's name and kind), because names change and an archived task can be
  hard-deleted.
- **Time per column comes from Activity.** Every move records the column it left and the one it entered, with their
  kinds, so "time in each column" and "card age" are sums over a task's move entries, never a separate counter.
- **Every project read and write checks membership.** A middleware loads the project and the viewer's membership
  (admins pass) before the procedure runs; route guards only shape navigation.
- **Order is a position key.** Columns are ordered within a project and cards within a column by a fractional key. The
  browser computes the key for its optimistic move and the server checks it; if two people drop into the same gap at
  once, the server picks a fresh key and the board refetches.
- **Logic follows column kind, never name** (rule 8): procedures look columns up by kind.
- **Optimistic updates** update the Query cache in `onMutate`, roll back in `onError` with a toast, and invalidate in
  `onSettled` (`docs/frontend/data-loading.md`).

## Slices

### 1. Team and Projects ✓

- **Accounts**: close public sign-up (Better-Auth's sign-up and the sign-up tab go; the Altcha captcha stays for
  public forms, as the template documents it). An admin page lists users and creates one (name, e-mail, password),
  promotes or demotes, deactivates or reactivates, with the last-admin guard; nobody changes their own account.
- **Projects**: an admin creates a project (name, key), which gets the seven default columns. A member list per
  project, edited by an admin.
- **Activity**: the table, the trigger and the helper, recording project and membership changes from the start.
- **Pages**: `/` becomes the projects list (a member with one project goes straight to it), `/projects/$projectKey`
  the board (today's empty columns, now the project's real ones), `/team`, `/projects/$projectKey/settings`. The URL
  uses the project's key, which never changes.
- **Tests**: a non-member can't read a project; the last admin can't be demoted; Activity can't be updated or deleted.

### 2. Tasks on the Board ✓

- Create, edit and archive a task: title, description (rich text), priority, due date, estimate, labels, owner, assignee.
- Quick add at the bottom of a column: type a title, press Enter.
- Task codes (`TD-42`) from the project's counter.
- The card, from the approved design (`docs/frontend/reference/rr8-showcase/components/task-card.tsx`): title, code,
  assignee avatar, priority, due date, labels; the blocked and timer marks arrive with their slices.
- The card drawer, opened by a typed search param (`?task=TD-42`) so a card has a link: details and editing.
- Labels: a member adds them from the drawer; colours come from a fixed set in the theme (signals stay reserved).
- New primitives: `calendar` (DayPicker, Jalali in Persian) and `date-picker`; `rich-text-editor` and `rich-text` (read-only), both
  restyled as instrument parts (the editor is a field plate in a cut, its toolbar a row of compact keys).
- **Tests**: every task change writes Activity; archived tasks leave the board but keep their history.

### 3. Drag ✓

- Move cards between and within columns, reorder columns (admin), with optimistic moves and rollback.
- A "move to…" menu on every card, so moving never depends on dragging.
- Keyboard dragging, with announcements as Paraglide messages.
- A board layout each person picks (saved in their browser): one scrolling row, one row fitted to the window, or
  several rows of 2–4 columns.
- **Tests**: a move records left/entered columns; a stale position key is resolved, not duplicated.

### 4. Status and Time

- Start, pause (optional reason), resume, stop (required reason), reopen, done, wired to the column kinds.
- One running timer per user, enforced by the database (at most one open time log per user); starting another closes
  the old one in the same transaction (rule 2). Leaving a doing column closes the task's open logs (rule 3).
- Manual time entry ("worked 2h yesterday"); estimate against time spent on the card (the progress meter's threshold);
  card age and time in each column in the drawer.
- A "show cancelled" switch on the board, so stopped tasks can be found and reopened.
- **Tests**: rules 2, 3 and 5.

### 5. Dependencies

- "Waits for" links between tasks of a project; the 🔒 mark on the card and the blockers in the drawer.
- Rule 4: moving a blocked task into doing or done is refused unless forced with a comment.
- Cycles are refused: a recursive query checks the path before a link is saved.
- When a blocker is done, the blocked task's owner is notified (with slice 6's notifications; until then, Activity).
- **Tests**: a cycle is refused; a forced move leaves its comment.

### 6. Assign, Delegate and Notifications

- Assign a task; delegate with a note (assignee changes, owner doesn't, a delegation record is kept).
- The hand-off chain in the drawer (Sina → Ali → Reza); a "delegated by me" view.
- Notifications: a bell in the header with the unread count, a dropdown list, read and unread. Events: assigned to you,
  delegated to you, mentioned, unblocked. Refetched every 30 seconds or so.
- **Tests**: delegation never changes the owner; a notification reaches only its user.

### 7. Comments and History

- Comments in the rich-text editor, with @mentions; edit and soft-delete your own.
- The drawer's tabs: Comments, Activity, Time. A project-level activity feed.
- **Tests**: someone else's comment can't be edited.

### 8. Profile and Archive

- Profile: name and avatar (the template's image upload).
- An archive list per project; an admin can restore a task or hard-delete it from there (rule 10).

## Housekeeping

- In slice 1: rewrite `docs/app.md`'s Open Questions as a pointer to the Decisions here, and update the note
  references in `CLAUDE.md`, `docs/backend-flow.md` and `docs/frontend-flow.md` (notes are a feature now, still the
  shape to copy).
- Before the first deploy: replace `drizzle/` with one fresh initial migration, and seed the first admin with
  `pnpm db:seed` (a deploy step, per the `how-update-server` skill).
- After the MVP, the spec's "should have" list: My Tasks, filters, search, sub-tasks, checklists, attachments,
  watchers, WIP warnings, due-date alerts, real-time, keyboard shortcuts.
