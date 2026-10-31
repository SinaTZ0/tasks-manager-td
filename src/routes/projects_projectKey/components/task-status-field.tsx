import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import { isBackwardMove, type ColumnKind } from "#/orpc/project/constants";
import type { Person, Project } from "#/orpc/project/contract";
import { COLUMN_ACTION_RULES, isColumnAction, type ColumnAction } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ConfirmDialog, type ConfirmRequest } from "#/routes/projects_projectKey/components/confirm-dialog";
import { ReasonDialog, type ReasonRequest } from "#/routes/projects_projectKey/components/reason-dialog";
import { entersGuardedColumn } from "#/routes/projects_projectKey/dependencies";
import { availableActions, statusActionIcon, statusActionLabel } from "#/routes/projects_projectKey/task-status";
import { useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

/*===== Task Status Field =====*/

/**
 * The task's own status, in the details column and apart from the timer, so finishing or stopping the task is never
 * mistaken for stopping the clock: keys to mark it done, stop it, or reopen it, and, while it is stopped, who stopped
 * it and why. Stopping asks for its reason (rule 5); finishing a blocked task asks why it goes ahead (rule 4);
 * reopening a done task (a step back along the fixed columns) asks to confirm. A viewer sees only the note.
 */
export function TaskStatusField({
  task,
  project,
  code,
  people,
  blockers,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  code: string;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up: finishing it asks why first (rule 4). */
  blockers: string[];
  readOnly: boolean;
}) {
  const transition = useTaskTransition(project);
  // Kept after the dialog closes, so it can play its way out showing what it asked.
  const [asking, setAsking] = useState<{
    request: ReasonRequest;
    run: (reason: string) => void;
    open: boolean;
  } | null>(null);
  // Kept after closing for the same reason.
  const [confirming, setConfirming] = useState<{ request: ConfirmRequest; run: () => void; open: boolean } | null>(
    null,
  );

  const column = project.columns.find((item) => item.id === task.columnId);
  const kind: ColumnKind = column?.kind ?? "todo";
  const actions = availableActions({ kind, timing: false }).filter(isColumnAction);

  const take = (action: ColumnAction) => {
    if (action === "stop") {
      return setAsking({
        request: { kind: action, code },
        run: (reason) => transition({ taskId: task.id, action, reason }),
        open: true,
      });
    }

    const to = COLUMN_ACTION_RULES[action].to;
    const ahead = () => {
      if (blockers.length > 0 && entersGuardedColumn({ from: kind, to })) {
        return setAsking({
          request: { kind: "force", code, blockers },
          run: (forceComment) => transition({ taskId: task.id, action, forceComment }),
          open: true,
        });
      }
      transition({ taskId: task.id, action });
    };
    const target = project.columns.find((item) => item.kind === to);
    if (column && target && isBackwardMove({ from: kind, to })) {
      const request = {
        title: m.task_back_title({ code }),
        description: m.task_move_description({ from: columnTitle(column), to: columnTitle(target) }),
        confirm: statusActionLabel(action),
      };
      return setConfirming({ request, run: ahead, open: true });
    }
    ahead();
  };

  if (readOnly && !task.statusNote) return null;

  return (
    <section aria-labelledby="task-status-title" className="flex flex-col gap-3">
      <h3 id="task-status-title" className="text-body-sm font-semibold">
        {m.task_status()}
      </h3>

      {/*------ Keys ------*/}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = statusActionIcon(action);
            return (
              <Button key={action} variant="secondary" size="sm" onClick={() => take(action)}>
                <Icon data-icon="inline-start" />
                {statusActionLabel(action)}
              </Button>
            );
          })}
        </div>
      )}

      {/*------ Why ------*/}
      {task.statusNote && <StatusNote note={task.statusNote} people={people} />}

      {asking && (
        <ReasonDialog
          request={asking.request}
          open={asking.open}
          onOpenChange={(open) => setAsking({ ...asking, open })}
          onConfirm={asking.run}
        />
      )}
      {confirming && (
        <ConfirmDialog
          request={confirming.request}
          open={confirming.open}
          onOpenChange={(open) => setConfirming({ ...confirming, open })}
          onConfirm={confirming.run}
        />
      )}
    </section>
  );
}

/*===== Status Note =====*/

/** Who stopped the task, when, and the reason they gave. */
function StatusNote({ note, people }: { note: NonNullable<TaskDetail["statusNote"]>; people: Map<string, Person> }) {
  const name = people.get(note.actorId)?.name ?? "";
  const date = formatDate(note.at, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-1 rounded-chassis border border-border px-4 py-3">
      <p className="text-body-sm text-muted-foreground">{m.task_stopped_by({ name, date })}</p>
      {note.reason && <p className="text-body whitespace-pre-line">{note.reason}</p>}
    </div>
  );
}
