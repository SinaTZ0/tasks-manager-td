/*===== Notification Constants =====*/
// Browser-safe: the bell prints each kind as a sentence.

/**
 * What a person is told about (docs/task-manager-plan.md → slices 6, 12 and 17): a task assigned or delegated to them,
 * a mention in a comment, a task of theirs that nothing holds up any more, one of theirs that is due today or
 * tomorrow, or overdue (these two have no actor), and something that happened to a card they watch.
 */
export const NOTIFICATION_KINDS = [
  "assigned",
  "delegated",
  "mentioned",
  "unblocked",
  "due_soon",
  "overdue",
  "watched",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * What happened to a watched card, which a `watched` notification names: a comment, a status action, a drag into a
 * column of another kind, a hand-off, archiving.
 */
export const WATCHED_EVENTS = [
  "commented",
  "completed",
  "stopped",
  "reopened",
  "moved",
  "delegated",
  "archived",
] as const;

export type WatchedEvent = (typeof WATCHED_EVENTS)[number];

/** How many of the latest the bell lists. */
export const NOTIFICATION_LIST_LIMIT = 30;

/** How often the bell asks for new ones while the live stream is closed, in milliseconds. */
export const NOTIFICATION_POLL_MS = 30_000;
