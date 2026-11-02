import { columnTitle } from "#/lib/column-title";
import { formatDate, isoToDate } from "#/lib/locale";
import type { Notification } from "#/orpc/notification/contract";
import { m } from "#/paraglide/messages";

/*===== Notification Text =====*/
// How a notification reads: in the bell, and in a push notification (`src/orpc/push/`), which renders it on the server
// in the language of the browser that subscribed.

/** What happened to a watched card, as a sentence. */
function watchedSentence(item: Notification): string {
  const code = item.taskCode;
  const name = item.actorName ?? "";
  switch (item.event) {
    case "commented":
      return m.notification_watched_commented({ name, code });
    case "completed":
      return m.notification_watched_completed({ name, code });
    case "stopped":
      return m.notification_watched_stopped({ name, code });
    case "reopened":
      return m.notification_watched_reopened({ name, code });
    case "moved":
      return m.notification_watched_moved({
        name,
        code,
        column: item.columnKind ? columnTitle({ kind: item.columnKind, name: item.note }) : (item.note ?? ""),
      });
    case "delegated":
      return m.notification_watched_delegated({ name, code, to: item.note ?? "" });
    case "archived":
    case null:
      return m.notification_watched_archived({ name, code });
  }
}

/** The extra line a notification shows under its title: a hand-off's note, a comment's excerpt, a stop's reason. */
export function notificationDetail(item: Notification): string | null {
  if (item.kind === "delegated") return item.note;
  if (item.kind === "watched" && (item.event === "commented" || item.event === "stopped")) {
    return item.note;
  }
  return null;
}

/** The notification as a sentence: who did what to which task, or which task's due date came. */
export function notificationSentence(item: Notification): string {
  const code = item.taskCode;
  const name = item.actorName ?? "";
  switch (item.kind) {
    case "assigned":
      return m.notification_assigned({ name, code });
    case "delegated":
      return m.notification_delegated({ name, code });
    case "mentioned":
      return m.notification_mentioned({ name, code });
    case "unblocked":
      return m.notification_unblocked({ code, blocker: item.note ?? "" });
    case "due_soon":
      return m.notification_due_soon({ code, date: item.dueDate ? formatDate(isoToDate(item.dueDate)) : "" });
    case "overdue":
      return m.notification_overdue({ code, date: item.dueDate ? formatDate(isoToDate(item.dueDate)) : "" });
    case "watched":
      return watchedSentence(item);
  }
}
