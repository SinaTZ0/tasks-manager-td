/*===== Activity Constants =====*/
// Browser-safe: the history pages print each action as a sentence.

/** Every kind of change the history records. Stored as plain text (`activity.action`). */
export const ACTIVITY_ACTIONS = [
  /*------ Team ------*/
  "user.created",
  "user.role_changed",
  "user.status_changed",
  /*------ Project ------*/
  "project.created",
  "project.renamed",
  "member.added",
  "member.removed",
  "column.updated",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
