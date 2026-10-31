/*===== Activity Constants =====*/
// Browser-safe: the history pages print each action as a sentence.

/** Every kind of change the history records. Stored as plain text (`activity.action`). */
export const ACTIVITY_ACTIONS = [
  /*------ Team ------*/
  "user.created",
  "user.role_changed",
  "user.status_changed",
  "user.profile_updated",
  /*------ Project ------*/
  "project.created",
  "project.renamed",
  "member.added",
  "member.removed",
  "column.created",
  "column.updated",
  "column.moved",
  "column.deleted",
  "label.created",
  "label.updated",
  "label.deleted",
  /*------ Task ------*/
  "task.created",
  "task.updated",
  "task.moved",
  "task.reordered",
  "task.archived",
  "task.restored",
  "task.deleted",
  "task.delegated",
  "task.transferred",
  "task.copied",
  /*------ Status ------*/
  "task.completed",
  "task.stopped",
  "task.reopened",
  /*------ Time ------*/
  "time.started",
  "time.stopped",
  "time.added",
  "time.removed",
  /*------ Dependencies ------*/
  "dependency.added",
  "dependency.removed",
  "task.unblocked",
  /*------ Comments ------*/
  "comment.added",
  "comment.edited",
  "comment.deleted",
  /*------ Checklist ------*/
  "checklist.added",
  "checklist.ticked",
  "checklist.unticked",
  "checklist.removed",
  /*------ Attachments ------*/
  "attachment.added",
  "attachment.removed",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
