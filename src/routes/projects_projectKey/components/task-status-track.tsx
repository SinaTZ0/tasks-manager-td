import { ArrowLeftIcon, BanIcon, CheckIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Stepper, StepperItem } from "#/components/primitive/stepper/stepper";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/primitive/tooltip/tooltip";
import { columnTitle } from "#/lib/column-title";
import { formatDate } from "#/lib/locale";
import { positionBetween } from "#/lib/position";
import { isBackwardMove, type ColumnKind } from "#/orpc/project/constants";
import type { Person, Project } from "#/orpc/project/contract";
import { COLUMN_ACTION_RULES, type TaskStatusAction } from "#/orpc/task/constants";
import type { Board, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { ConfirmDialog, type ConfirmRequest } from "#/routes/projects_projectKey/components/confirm-dialog";
import { ReasonDialog, type ReasonRequest } from "#/routes/projects_projectKey/components/reason-dialog";
import { entersGuardedColumn } from "#/routes/projects_projectKey/dependencies";
import { statusActionLabel } from "#/routes/projects_projectKey/task-status";
import { useTaskMove, useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

type Column = Project["columns"][number];

/*===== Task Status Track =====*/

/**
 * Where the task stands, under its title: a tray holding the board's own columns as a track (the ones passed lit, the
 * current one a latched key whose LED blinks while the task is in doing, the ones ahead a press away), then the next step as its own key ("Send to “Review”", or "Mark done" before the done column), and
 * cancelling apart from it as a small graphite key. A done or cancelled task offers to reopen instead. A cancelled task
 * shows only that column, with who stopped it and why under the tray.
 *
 * Moving here follows the board's rules: a task still waiting for others asks why before it enters doing or done
 * (rule 4), a step back along the fixed columns asks to confirm, and cancelling asks for its reason (rule 5). A viewer
 * reads the track and presses nothing.
 */
export function TaskStatusTrack({
  task,
  project,
  board,
  code,
  people,
  blockers,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  board: Board;
  code: string;
  people: Map<string, Person>;
  /** The codes of the tasks still holding it up: entering doing or done asks why first (rule 4). */
  blockers: string[];
  readOnly: boolean;
}) {
  const transition = useTaskTransition(project);
  const moveTask = useTaskMove(project.id);
  // Kept after the dialog closes, so it can play its way out showing what it asked.
  const [asking, setAsking] = useState<{ request: ReasonRequest; run: (reason: string) => void; open: boolean } | null>(
    null,
  );
  // Kept after closing for the same reason.
  const [confirming, setConfirming] = useState<{ request: ConfirmRequest; run: () => void; open: boolean } | null>(
    null,
  );

  const column = project.columns.find((item) => item.id === task.columnId);
  const kind: ColumnKind = column?.kind ?? "todo";
  const cancelled = kind === "cancelled";
  // The track is the board's columns; cancelled is no step on the way, it is left by its own key.
  const steps = project.columns.filter((item) => item.kind !== "cancelled");
  const here = steps.findIndex((item) => item.id === task.columnId);
  const next = here === -1 ? undefined : steps[here + 1];
  // Work under way: the doing column is how people say they are on a task.
  const live = kind === "doing";

  /*------ Guards ------*/
  /** Goes ahead with `run`, first asking why when a task still waiting for others enters doing or done (rule 4). */
  const guarded = ({ to, run }: { to: ColumnKind; run: (forceComment?: string) => void }) => {
    if (blockers.length > 0 && entersGuardedColumn({ from: kind, to })) {
      return setAsking({ request: { kind: "force", code, blockers }, run, open: true });
    }
    run();
  };

  /** Runs `ahead`, first asking to confirm a step back along the fixed columns. */
  const confirmedBack = ({ to, ahead }: { to: Column; ahead: () => void }) => {
    if (column && isBackwardMove({ from: kind, to: to.kind })) {
      const request = {
        title: m.task_back_title({ code }),
        description: m.task_move_description({ from: columnTitle(column), to: columnTitle(to) }),
        confirm: m.task_back_confirm(),
      };
      return setConfirming({ request, run: ahead, open: true });
    }
    ahead();
  };

  /*------ Moves ------*/
  /** Moves the card to the bottom of `to`, the way the board's menu does. Entering done is the done action. */
  const goTo = (to: Column) => {
    const run = (forceComment?: string) => {
      if (to.kind === "done") return transition({ taskId: task.id, action: "done", forceComment });
      const last = board.tasks.findLast((item) => item.columnId === to.id && item.id !== task.id);
      moveTask({
        taskId: task.id,
        columnId: to.id,
        position: positionBetween(last?.position ?? null, null),
        forceComment,
      });
    };
    confirmedBack({ to, ahead: () => guarded({ to: to.kind, run }) });
  };

  /** Cancels (asking for the reason) or reopens the task. */
  const take = (action: Exclude<TaskStatusAction, "done">) => {
    if (action === "stop") {
      return setAsking({
        request: { kind: action, code },
        run: (reason) => transition({ taskId: task.id, action, reason }),
        open: true,
      });
    }
    const to = project.columns.find((item) => item.kind === COLUMN_ACTION_RULES.reopen.to);
    const ahead = () => transition({ taskId: task.id, action });
    if (to) return confirmedBack({ to, ahead });
    ahead();
  };

  const canCancel = (COLUMN_ACTION_RULES.stop.from as readonly ColumnKind[]).includes(kind);
  const canReopen = (COLUMN_ACTION_RULES.reopen.from as readonly ColumnKind[]).includes(kind);

  return (
    <div className="flex flex-col gap-3">
      {/*------ Tray ------*/}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-chassis bg-tray px-3 py-2.5 shadow-tray">
        <Stepper aria-label={m.task_status()}>
          {cancelled && column ? (
            <StepperItem state="current" signal="attention">
              {columnTitle(column)}
            </StepperItem>
          ) : (
            steps.map((step, index) => (
              <StepperItem
                key={step.id}
                state={index < here ? "complete" : index === here ? "current" : "upcoming"}
                live={live}
                onSelect={readOnly ? undefined : () => goTo(step)}
                selectLabel={m.task_track_move({ column: columnTitle(step) })}
              >
                <bdi>{columnTitle(step)}</bdi>
              </StepperItem>
            ))
          )}
        </Stepper>

        {/*------ Next Step ------*/}
        {!readOnly && (
          <div className="ms-auto flex items-center gap-3">
            {canReopen ? (
              <Button variant="secondary" size="sm" onClick={() => take("reopen")}>
                <RotateCcwIcon data-icon="inline-start" />
                {statusActionLabel("reopen")}
              </Button>
            ) : (
              next && (
                <Button variant="secondary" size="sm" onClick={() => goTo(next)}>
                  {next.kind === "done" ? (
                    <>
                      <CheckIcon data-icon="inline-start" />
                      {statusActionLabel("done")}
                    </>
                  ) : (
                    <>
                      {m.task_track_next({ column: columnTitle(next) })}
                      {/* Points the way the track runs: left in Persian, right in English. */}
                      <ArrowLeftIcon data-icon="inline-end" className="ltr:rotate-180" />
                    </>
                  )}
                </Button>
              )
            )}
            {canCancel && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="default"
                      size="icon-sm"
                      aria-label={statusActionLabel("stop")}
                      onClick={() => take("stop")}
                    >
                      <BanIcon />
                    </Button>
                  }
                />
                <TooltipContent>{statusActionLabel("stop")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

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
    </div>
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
