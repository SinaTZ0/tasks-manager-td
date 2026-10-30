/*===== Notification Constants =====*/
// Browser-safe: the bell prints each kind as a sentence.

/**
 * What a person is told about (docs/task-manager-plan.md → slice 6): a task assigned or delegated to them, a mention
 * in a comment, and a task of theirs that nothing holds up any more.
 */
export const NOTIFICATION_KINDS = ["assigned", "delegated", "mentioned", "unblocked"] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** How many of the latest the bell lists. */
export const NOTIFICATION_LIST_LIMIT = 30;

/** How often the bell asks for new ones, in milliseconds: no live connection yet, so it polls. */
export const NOTIFICATION_POLL_MS = 30_000;
