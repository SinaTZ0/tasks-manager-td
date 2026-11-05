# Tofang (تفنگ): Product Spec

Internal tool. 5 users. Many tasks. Need see who do what.
App = kanban board. Task is card. Card sits in column. Drag card, card move.
Know what happened, who did it, how long it took. No lost work. No forgotten tasks.

How it looks: [frontend/app-identity.md](./frontend/app-identity.md). How it's built: [CLAUDE.md](../CLAUDE.md).

---

## Principles

- 5 users. All trusted. No complex permissions. Admin = 1 or 2 users.
- Every change recorded (history). Nothing hard-deleted (archive instead).
- Board must feel fast. Drag = instant. Server catch up after.
- Simple first. Fancy later.

---

## Entities

What each thing is and how it relates. How to store it = implementer decides.

- **User** — Team member. Admin, user or viewer (task-manager-plan.md → Decisions → Roles). User leaves team → deactivate, never delete.
- **Board** — One project (or one for everything). Has many Columns, many Tasks, many members.
- **Column** — Status column on board. Has order, optional WIP limit. Each column has a _kind_ separate from its name. Name can change freely, kind keeps logic working. Every board always has **To Do**, **Doing** and **Done** (fixed, in that order, never moved or removed) and a hidden **Cancelled**. Admin adds own columns (kind _custom_, no logic of their own) anywhere around them, renames them, removes them once empty.
- **Task** — The card. Lives in one Column. Has one **owner** (responsible for it) and any number of **assignees** (doing the work); the owner can be one of them. Has priority, due date, estimate, labels. Can have parent Task (sub-task).
- **Dependency** — Task waits for other Task. Many-to-many between Tasks. No cycles.
- **Comment** — Discussion on a Task. Can mention other users.
- **Delegation** — Record of Task handed from one user to another, with note. Chain of these = full hand-off history.
- **Activity** — Record of every change on Task or Board: who, what, before, after, when. Append only, never edited.
- **Label** — Colored tag, belongs to Board. Task has many.
- **Checklist item** — Small step inside Task. Too small for own Task.
- **Attachment** — File or link on Task.
- **Notification** — Alert for one user about one event. Read or unread.
- **Reminder** — One user's private note to self about one Task, at a set time. Becomes a Notification.
- **Watcher** — User following a Task without owning or doing it.

---

## Features

### 🟢 Must Have (MVP)

**Board & Drag**

- See board with columns and cards
- Drag card between columns (change status)
- Drag card inside column (change order)
- Drag columns left/right (change column order): admin only, custom columns only. To Do, Doing, Done keep their order.
- Card going **back** along To Do → Doing → Done (Done → Doing, Done → To Do, Doing → To Do) asks to confirm first. Moves
  in or out of custom columns don't ask.
- Optimistic update: card moves now, server confirms later. Server rejects → card goes back.

**Task**

- Create / edit / archive task
- Title, description (markdown), priority, due date, labels
- New task: the orange key above the board (or `n`) asks for a title and a column (the first on the board by default),
  creates the task with its maker as an assignee, and opens it to fill in the rest
- Admin moves a card to another project (new number there; the old code still opens it; dependencies dropped; refused
  while its owner or an assignee isn't on that project) or copies it there (no comments, time or history)
- Card shows: title, owner and assignees' avatars (down its edge), priority meter, due date, labels, blocked icon

**Status / Cancel**

- No clock: nobody starts or stops a timer. A card in **Doing** is work under way, and its assignees are who is on it.
- **Cancel task** → task cancelled, reason required, card hidden in Cancelled. Can reopen.
- **Done** → record finish time
- **Reopen** → back to To Do (from Done it asks first, like any step back)

**Duration / Time**

- Read from the history, never typed or timed: total age of card (created → done) and time in each column, Doing
  among them.

**Dependency**

- "This task waits for that task"
- Card blocked → show 🔒 badge and the blocking tasks
- Move blocked card to Doing/Done → app warns (or refuses, configurable)
- Blocker done → blocked card's owner notified "unblocked"
- No cyclic dependencies

**Assign & Delegate**

- Assign task to one or more users
- Delegate: "you do this now" → new person joins the assignees (in my place, if I was one), Delegation recorded, they
  are notified
- Owner stays the same. Owner still sees task in "Delegated by me" view
- See full chain: Sina → Ali → Reza

**Comments**

- Add / edit / delete own comment
- `@mention` user → notification
- A card's owner and assignees hear about every comment on it, and about someone else moving it to another kind of
  column, finishing, cancelling, reopening or archiving it, without watching it
- Commenting on a card, or being mentioned there, makes you watch it; anyone on the project can watch a card, and
  watchers hear about its comments, status changes, hand-offs and archiving
- Markdown in comments
- Ping: the red key at the foot of a card's tray, and beside Send in its thread, asks how the work is going. It posts
  a plain comment, so it reads, counts and notifies like any other. Press and hold half a second: a short press does
  nothing, and the card's menu offers it without the hold. Only on cards in Doing or a custom column, for anyone who
  can comment, with no limit on how often. Each person can set the words in their profile; empty means "How is it
  going?" in the language they ping in

**Reminders**

- "Remind me" on a card, or in its drawer: one key sets 30 minutes from now, and each press moves it on half an hour, up
  to 3 hours and then round to 30. The other way is picking a date and time, on the team's clock. An optional short
  note goes with it
- A card with one wears a clip on its top edge, beside the priority LEDs, printing the time left, or the date when it is
  a day or more away. Pressing the clip opens it again. My Tasks lists the ones waiting
- Private: only its person sees it, so it stays out of the history. Anyone on the project can set one, a viewer too
- One per person per card; a new one replaces the old. Not on an archived card
- Time comes → a notification in the bell and a push. A card finished, cancelled or archived meanwhile still reminds,
  and says so. Dropped only for someone who can no longer open the card
- A reminder that rang can be put off from the bell: an hour, or tomorrow morning (09:00 on the team's clock). Not one
  on an archived card
- Follows a card moved to another project

**History**

- Every card has Activity tab: who did what, when
- Board-level activity feed too
- History never editable

**Users**

- Login (email + password, or magic link, or Google — 5 users, keep simple)
- Profile: name, avatar, ping message, password (asks for the current one, signs out other devices)
- Lost password: an admin sets a new one on the team page and passes it on, which signs the person out everywhere. No
  email, so an admin can't reset their own from there

### 🟡 Should Have (soon after)

- **My Tasks** view — all cards assigned to me, across boards
- **Filters** — by assignee, label, priority, due date, blocked
- **Search** — find card by title / description / comment
- **Sub-tasks** — task inside task, parent shows progress (3/5)
- **Checklist** — small todo list inside card
- **Attachments** — upload file / paste image / add link
- **Notifications** — in-app bell + optional email/Slack/Telegram
- **Watchers** — follow card without owning it
- **WIP limit** — column over limit = red warning
- **Due date alerts** — due soon (yellow), overdue (red), notify assignee
- **Real-time** — someone moves card, everyone sees it live (websocket)
- **Card ID** — short id like `TD-42`, easy to reference in chat
- **Keyboard shortcuts** — `n` new card, `/` search, `e` edit

### 🔵 Nice to Have (later, maybe)

- **Recurring tasks** — every Monday create "weekly report" card
- **Templates** — card templates (bug, feature, chore) with pre-filled checklist
- **Reports** — time in Doing per user / per label / per week, cycle time, throughput
- **Calendar view** — cards by due date
- **List / table view** — not everyone likes kanban
- **Swimlanes** — group rows by assignee or priority
- **Dependency graph** — visual of what blocks what
- **Bulk actions** — select many cards, move / assign / label at once
- **Reactions** on comments 👍🔥
- **Archive & restore** — bring back archived cards
- **Export** — CSV / JSON
- **Dark mode**
- **Mobile friendly** — at least view + comment + move

---

## Business Rules

1. Card in **one** column only.
2. A task's maker is one of its assignees from the start.
3. Card enters Done → its finish time is recorded; leaving Done clears it.
4. Blocked card can't go Done until blockers are Done (or user forces it + leaves comment).
5. Cancelling a task requires a reason.
6. Delegation never changes owner. Owner = responsible. Assignee = does the work.
7. Every change → Activity entry. The one exception is a Reminder: private, and it doesn't change the card. Activity
   never edited, never deleted.
8. App logic follows column _kind_, never column _name_.
9. Delete user? No. Deactivate. Their cards and name stay.
10. Delete card? Archive. Hard delete only by admin, only from archive.

---

## Screens

- **Login**
- **Boards list**
- **Board** (main kanban) — columns, cards, filter bar, search
- **Card drawer/modal** — a header with the code, the title (edited in place) and the status track: the board's columns in order (the ones passed lit, the current one latched, its LED blinking while in Doing, any other a press away, following the same rules as a drag), the next step as its own key (Send to the next column, or Mark done before Done; Reopen once done or cancelled) and Cancel apart from it. Under it, up to three columns the user can resize, each switched on and off by a folder tab on the header's edge that prints a summary of what it holds: the work (description, checklist, attachments and the comment thread; the only one on at first), the tracking (the card's age and time in each column, dependencies, history, one under the other), and the details (priority, people, dates, labels, delegation, as label and value rows)
- **My Tasks** — assigned to me, delegated by me, watching
- **Notifications** — bell dropdown
- **Settings** — columns (add, rename, remove when empty), labels, members, WIP limits

---

## Open Questions

Answered on 2026-10-30; the decisions, and the rules that follow from them, are in
[task-manager-plan.md](./task-manager-plan.md) → Decisions. Where they differ from this spec, they win: one board per
project, delegation accepted automatically, a blocked card refused (unless forced with a comment), in-app
notifications only, self-hosted, and rich text (Tiptap) in place of Markdown.
