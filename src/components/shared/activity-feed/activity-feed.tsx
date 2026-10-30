import { Link } from "@tanstack/react-router";

import { Marking } from "#/components/primitive/marking/marking";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { isolate } from "#/lib/bidi";
import { columnKindTitle, columnTitle } from "#/lib/column-title";
import { formatClock, formatDuration } from "#/lib/duration";
import { formatDate, formatList, isoToDate } from "#/lib/locale";
import { priorityName } from "#/lib/priority-name";
import type { ActivityItem } from "#/orpc/activity/contract";
import { COLUMN_KINDS, type ColumnKind } from "#/orpc/project/constants";
import type { Person } from "#/orpc/project/contract";
import { TASK_PRIORITIES, type TaskPriority } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Reading Entries =====*/
// An entry's fields are whatever its `recordActivity` call stored (jsonb), so every read checks the type and falls back
// instead of trusting it: an old entry may predate a field, and a missing one should cost a word, not the page.

type Fields = Record<string, unknown> | null;

const textOf = (fields: Fields, key: string): string | null => {
  const value = fields?.[key];
  return typeof value === "string" ? value : null;
};

const numberOf = (fields: Fields, key: string): number | null => {
  const value = fields?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const isColumnKind = (value: unknown): value is ColumnKind => COLUMN_KINDS.includes(value as ColumnKind);
const isPriority = (value: unknown): value is TaskPriority => TASK_PRIORITIES.includes(value as TaskPriority);

/** The column an entry names (`columnKind` and `columnName`, or `kind` and `name` on column entries). */
function columnOf(fields: Fields, { kindKey = "columnKind", nameKey = "columnName" } = {}): string {
  const kind = fields?.[kindKey];
  const name = textOf(fields, nameKey);
  if (isColumnKind(kind)) return isolate(columnTitle({ kind, name }));
  return isolate(name ?? "?");
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A day stored as ISO (`2026-10-30`), as the reader's calendar writes it. */
const dayOf = (iso: string | null) =>
  iso && ISO_DAY.test(iso) ? formatDate(isoToDate(iso), { dateStyle: "medium" }) : "?";

/*===== Sentences =====*/

/** What an entry says after its actor's name: one or more clauses, and text it quoted (a reason, a note, a comment). */
type Sentence = { clauses: string[]; quote?: string | null; forced?: boolean };

/**
 * The changes of a `task.updated` entry, one clause each. People are stored by id; `people` names them, and someone
 * who has left the project reads as "someone".
 */
function taskUpdateClauses({ item, nameOf }: { item: ActivityItem; nameOf: (id: unknown) => string }): string[] {
  const { before, after } = item;
  const clauses: string[] = [];
  for (const key of Object.keys(after ?? {})) {
    const next = after?.[key];
    switch (key) {
      case "title":
        clauses.push(m.activity_task_title({ title: isolate(textOf(after, "title") ?? "") }));
        break;
      case "description":
        clauses.push(m.activity_task_description());
        break;
      case "priority": {
        const previous = before?.priority;
        clauses.push(
          isPriority(previous) && isPriority(next)
            ? m.activity_task_priority({ from: priorityName(previous), to: priorityName(next) })
            : m.activity_task_changed(),
        );
        break;
      }
      case "dueDate":
        clauses.push(
          typeof next === "string" ? m.activity_task_due_set({ date: dayOf(next) }) : m.activity_task_due_removed(),
        );
        break;
      case "estimateMinutes":
        clauses.push(
          typeof next === "number"
            ? m.activity_task_estimate_set({ duration: isolate(formatDuration(next)) })
            : m.activity_task_estimate_removed(),
        );
        break;
      case "ownerId":
        clauses.push(m.activity_task_owner({ name: nameOf(next) }));
        break;
      case "assigneeId":
        clauses.push(
          typeof next === "string" ? m.activity_task_assigned({ name: nameOf(next) }) : m.activity_task_unassigned(),
        );
        break;
      case "labels": {
        const names = Array.isArray(next) ? next.filter((name): name is string => typeof name === "string") : [];
        clauses.push(
          names.length > 0
            ? m.activity_task_labels({ labels: formatList(names.map(isolate)) })
            : m.activity_task_labels_removed(),
        );
        break;
      }
      default:
        clauses.push(m.activity_task_changed());
    }
  }
  return clauses.length > 0 ? clauses : [m.activity_task_changed()];
}

/** The sentence for one entry. Covers every action in `ACTIVITY_ACTIONS`: the switch is exhaustive. */
function describe({ item, people }: { item: ActivityItem; people: Map<string, Person> }): Sentence {
  const { before, after, snapshot } = item;
  const nameOf = (id: unknown) =>
    isolate((typeof id === "string" ? people.get(id)?.name : undefined) ?? m.activity_someone());
  // Entries about a person keep their name in the snapshot, so it reads right after they leave.
  const snapshotName = () => isolate(textOf(snapshot, "name") ?? m.activity_someone());
  const forced = after?.forced === true;

  switch (item.action) {
    /*------ Team ------*/
    case "user.created":
      return { clauses: [m.activity_user_created({ name: snapshotName() })] };
    case "user.role_changed":
      return {
        clauses: [
          m.activity_user_role_changed({
            name: snapshotName(),
            role: textOf(after, "role") === "admin" ? m.team_role_admin() : m.team_role_user(),
          }),
        ],
      };
    case "user.status_changed":
      return {
        clauses: [
          textOf(after, "status") === "active"
            ? m.activity_user_activated({ name: snapshotName() })
            : m.activity_user_deactivated({ name: snapshotName() }),
        ],
      };

    case "user.profile_updated":
      return { clauses: [m.activity_user_profile_updated()] };

    /*------ Project ------*/
    case "project.created":
      return { clauses: [m.activity_project_created()] };
    case "project.renamed":
      return {
        clauses: [
          m.activity_project_renamed({
            from: isolate(textOf(before, "name") ?? ""),
            to: isolate(textOf(after, "name") ?? ""),
          }),
        ],
      };
    case "member.added":
      return { clauses: [m.activity_member_added({ name: snapshotName() })] };
    case "member.removed":
      return { clauses: [m.activity_member_removed({ name: snapshotName() })] };
    case "column.updated": {
      // A column with no name of its own goes by its kind's.
      const kind = snapshot.kind;
      const fallback = isColumnKind(kind) ? columnKindTitle(kind) : "?";
      const from = textOf(before, "name") ?? fallback;
      const to = textOf(after, "name") ?? fallback;
      const clauses: string[] = [];
      if (from !== to) clauses.push(m.activity_column_renamed({ from: isolate(from), to: isolate(to) }));
      const limit = numberOf(after, "wipLimit");
      if (limit !== numberOf(before, "wipLimit")) {
        clauses.push(
          limit === null
            ? m.activity_column_wip_removed({ column: isolate(to) })
            : m.activity_column_wip_set({ column: isolate(to), limit }),
        );
      }
      return {
        clauses: clauses.length > 0 ? clauses : [m.activity_column_renamed({ from: isolate(from), to: isolate(to) })],
      };
    }
    case "column.moved":
      return {
        clauses: [m.activity_column_moved({ column: columnOf(snapshot, { kindKey: "kind", nameKey: "name" }) })],
      };
    case "label.created":
      return { clauses: [m.activity_label_created({ name: isolate(textOf(after, "name") ?? "?") })] };

    /*------ Task ------*/
    case "task.created":
      return { clauses: [m.activity_task_created({ column: columnOf(snapshot) })] };
    case "task.updated":
      return { clauses: taskUpdateClauses({ item, nameOf }) };
    case "task.moved":
      return { clauses: [m.activity_task_moved({ from: columnOf(before), to: columnOf(after) })], forced };
    case "task.reordered":
      return { clauses: [m.activity_task_reordered({ column: columnOf(after) })] };
    case "task.archived":
      return { clauses: [m.activity_task_archived()] };
    case "task.restored":
      return { clauses: [m.activity_task_restored()] };
    case "task.deleted":
      return { clauses: [m.activity_task_deleted()] };
    case "task.delegated":
      return {
        clauses: [m.activity_task_delegated({ name: nameOf(after?.assigneeId) })],
        quote: textOf(after, "note"),
      };

    /*------ Status ------*/
    case "task.started":
      return {
        clauses: [before?.columnKind === "paused" ? m.activity_task_resumed() : m.activity_task_started()],
        forced,
      };
    case "task.paused":
      return { clauses: [m.activity_task_paused()], quote: textOf(after, "reason") };
    case "task.completed":
      return { clauses: [m.activity_task_completed()], forced };
    case "task.stopped":
      return { clauses: [m.activity_task_stopped()], quote: textOf(after, "reason") };
    case "task.reopened":
      return { clauses: [m.activity_task_reopened()] };

    /*------ Time ------*/
    case "time.started":
      return { clauses: [m.activity_time_started()] };
    case "time.stopped": {
      const duration = isolate(formatClock(numberOf(after, "seconds") ?? 0));
      // Pausing or archiving a task stops everyone's timer on it, so the timer can be someone else's.
      const owner = after?.userId;
      return {
        clauses: [
          owner === undefined || owner === item.actorId
            ? m.activity_time_stopped({ duration })
            : m.activity_time_stopped_other({ name: nameOf(owner), duration }),
        ],
      };
    }
    case "time.added":
      return {
        clauses: [
          m.activity_time_added({
            duration: isolate(formatDuration(numberOf(after, "minutes") ?? 0)),
            date: dayOf(textOf(after, "date")),
          }),
        ],
        quote: textOf(after, "note"),
      };
    case "time.removed":
      return {
        clauses: [
          m.activity_time_removed({
            duration: isolate(formatDuration(numberOf(before, "minutes") ?? 0)),
            date: dayOf(textOf(before, "date")),
          }),
        ],
      };

    /*------ Dependencies ------*/
    case "dependency.added":
      return { clauses: [m.activity_dependency_added({ code: isolate(textOf(after, "blockerCode") ?? "?") })] };
    case "dependency.removed":
      return { clauses: [m.activity_dependency_removed({ code: isolate(textOf(before, "blockerCode") ?? "?") })] };
    case "task.unblocked":
      return { clauses: [m.activity_task_unblocked({ code: isolate(textOf(after, "blockerCode") ?? "?") })] };

    /*------ Comments ------*/
    case "comment.added":
      return { clauses: [m.activity_comment_added()], quote: textOf(after, "text") };
    case "comment.edited":
      return { clauses: [m.activity_comment_edited()] };
    case "comment.deleted":
      return { clauses: [m.activity_comment_deleted()] };
  }
}

/*===== Feed =====*/

/**
 * A list of history entries, in the order given: who did it, what they did as a sentence in the reader's language, and
 * when. `people` names the people an entry stores by id (an owner, an assignee, a timer's owner); the actor's own name
 * comes with the entry. With `showTask` (a project's feed) each task entry also links to its card on the board, which
 * needs `projectKey`.
 */
export function ActivityFeed({
  items,
  people,
  showTask = false,
  projectKey,
}: {
  items: ActivityItem[];
  people: Map<string, Person>;
  showTask?: boolean;
  projectKey?: string;
}) {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <ActivityEntry
          key={item.id}
          item={item}
          people={people}
          taskKey={showTask && item.taskCode ? projectKey : undefined}
        />
      ))}
    </ol>
  );
}

/*===== Entry =====*/

/** One entry. `taskKey`, when given, is the project key its task's link opens on. */
function ActivityEntry({
  item,
  people,
  taskKey,
}: {
  item: ActivityItem;
  people: Map<string, Person>;
  taskKey: string | undefined;
}) {
  const sentence = describe({ item, people });

  return (
    <li className="flex gap-3 py-3">
      <PersonAvatar name={item.actorName} src={item.actorAvatarUrl} decorative />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/*------ Task ------*/}
        {taskKey && item.taskCode && (
          <Link
            to="/projects/$projectKey"
            params={{ projectKey: taskKey }}
            search={{ task: item.taskCode }}
            className="flex w-fit max-w-full min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Marking variant="code">{item.taskCode}</Marking>
            {item.taskTitle && (
              <span dir="auto" className="truncate text-body-sm font-semibold">
                {item.taskTitle}
              </span>
            )}
          </Link>
        )}

        {/*------ Sentence ------*/}
        <p className="text-body-sm">
          <bdi className="font-semibold">{item.actorName}</bdi> {formatList(sentence.clauses)}
        </p>
        {sentence.quote && (
          <p className="line-clamp-3 border-s-2 border-border ps-3 text-body-sm whitespace-pre-line text-muted-foreground">
            <bdi>{sentence.quote}</bdi>
          </p>
        )}
        {sentence.forced && <Marking>{m.activity_task_forced()}</Marking>}
      </div>

      {/*------ When ------*/}
      <time dateTime={item.createdAt.toISOString()} className="shrink-0 text-caption text-muted-foreground">
        {formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}
      </time>
    </li>
  );
}
