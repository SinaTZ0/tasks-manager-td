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
- **Column** — Status column on board. Has order, optional WIP limit. Each column has a _kind_ (backlog, todo, doing, paused, review, done, cancelled) separate from its name. Name can change freely, kind keeps logic working.
- **Task** — The card. Lives in one Column. Has one **owner** (responsible for it) and one **assignee** (doing the work), can be same user. Has priority, due date, estimate, labels. Can have parent Task (sub-task).
- **Dependency** — Task waits for other Task. Many-to-many between Tasks. No cycles.
- **Comment** — Discussion on a Task. Can mention other users.
- **TimeLog** — One stretch of work by one user on one Task. Many per Task. Real time spent = sum of these.
- **Delegation** — Record of Task handed from one user to another, with note. Chain of these = full hand-off history.
- **Activity** — Record of every change on Task or Board: who, what, before, after, when. Append only, never edited.
- **Label** — Colored tag, belongs to Board. Task has many.
- **Checklist item** — Small step inside Task. Too small for own Task.
- **Attachment** — File or link on Task.
- **Notification** — Alert for one user about one event. Read or unread.
- **Watcher** — User following a Task without owning or doing it.

---

## Features

### 🟢 Must Have (MVP)

**Board & Drag**

- See board with columns and cards
- Drag card between columns (change status)
- Drag card inside column (change order)
- Drag columns left/right (change column order)
- Optimistic update: card moves now, server confirms later. Server rejects → card goes back.

**Task**

- Create / edit / archive task
- Title, description (markdown), priority, due date, labels
- Quick add: type title at column bottom, press Enter, done
- Admin moves a card to another project (new number there; the old code still opens it; dependencies dropped; refused
  while its owner or assignee isn't on that project) or copies it there (no comments, time or history)
- Card shows: title, assignee avatar, priority color, due date, labels, blocked icon, timer icon

**Status / Pause / Stop**

- Move to **Doing** → timer can start
- **Pause** → card goes to Paused column, timer stops, ask "why pause?" (optional note)
- **Resume** → back to Doing
- **Stop** → task cancelled, reason required, card hidden in Cancelled. Can reopen.
- **Done** → record finish time, timer stops

**Duration / Time**

- Start / pause / stop timer on card
- Manual time entry ("worked 2h yesterday")
- Show: estimate vs real time spent
- Show: total age of card (created → done) and time in each column (from history)

**Dependency**

- "This task waits for that task"
- Card blocked → show 🔒 badge and the blocking tasks
- Move blocked card to Doing/Done → app warns (or refuses, configurable)
- Blocker done → blocked card's owner notified "unblocked"
- No cyclic dependencies

**Assign & Delegate**

- Assign task to user
- Delegate: "you do this now" → assignee changes, Delegation recorded, new assignee notified
- Owner stays the same. Owner still sees task in "Delegated by me" view
- See full chain: Sina → Ali → Reza

**Comments**

- Add / edit / delete own comment
- `@mention` user → notification
- Commenting on a card, or being mentioned there, makes you watch it; anyone on the project can watch a card, and
  watchers hear about its comments, status changes, hand-offs and archiving
- Markdown in comments

**History**

- Every card has Activity tab: who did what, when
- Board-level activity feed too
- History never editable

**Users**

- Login (email + password, or magic link, or Google — 5 users, keep simple)
- Profile: name, avatar

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
- **Reports** — time spent per user / per label / per week, cycle time, throughput
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
2. One running timer per user. Start new → old one auto-pauses.
3. Card leaves Doing → timer auto-pauses.
4. Blocked card can't go Done until blockers are Done (or user forces it + leaves comment).
5. Stop requires reason. Pause reason optional.
6. Delegation never changes owner. Owner = responsible. Assignee = does the work.
7. Every change → Activity entry. No exceptions. Activity never edited, never deleted.
8. App logic follows column _kind_, never column _name_.
9. Delete user? No. Deactivate. Their cards and name stay.
10. Delete card? Archive. Hard delete only by admin, only from archive.

---

## Screens

- **Login**
- **Boards list**
- **Board** (main kanban) — columns, cards, filter bar, search
- **Card drawer/modal** — details, checklist, sub-tasks, dependencies, timer, tabs: Comments | Activity | Time
- **My Tasks** — assigned to me, delegated by me, watching
- **Notifications** — bell dropdown
- **Settings** — columns, labels, members, WIP limits

---

## Open Questions

Answered on 2026-10-30; the decisions, and the rules that follow from them, are in
[task-manager-plan.md](./task-manager-plan.md) → Decisions. Where they differ from this spec, they win: one board per
project, delegation accepted automatically, a blocked card refused (unless forced with a comment), in-app
notifications only, self-hosted, and rich text (Tiptap) in place of Markdown.
