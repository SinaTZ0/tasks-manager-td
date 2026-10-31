import { ORPCError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import { positionBetween } from "#/lib/position";
import { COLUMN_ACTION_RULES, isColumnAction, type TaskStatusAction } from "#/orpc/task/constants";
import type { Board, TaskCard } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { boardQuery, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Helpers =====*/

/** Keys compare byte-wise (`src/lib/position.ts`), the way the server orders them. */
const byPosition = (a: { position: string }, b: { position: string }) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

/** Shows why a move was refused, or the fallback when the server gave no reason. */
function reportFailure({ error, fallback }: { error: unknown; fallback: string }) {
  // The board asks before moving a blocked task, so this is a blocker someone else added meanwhile.
  if (error instanceof ORPCError && error.code === "BLOCKED") {
    toast.add({ title: m.dependency_blocked_refused(), type: "error" });
    return;
  }
  const failure = describeApiFailure({ error, fallback });
  toast.add({ title: failure.message ?? Object.values(failure.fields)[0] ?? fallback, type: "error" });
}

/*===== Task Move =====*/

/**
 * Moves a card to a column at a position key (docs/app.md → Board & Drag: the card moves now, the server catches up).
 * The board's cache is written before the request goes out, in the same tick as the call, so a drop never shows the
 * card back in its old place for a frame. A refused move puts the board back as it was and says why; either way the
 * board is refetched afterwards, so the server's key (it may have picked a fresh one) wins.
 */
export function useTaskMove(projectId: string) {
  const queryClient = useQueryClient();
  const key = boardQuery(projectId).queryKey;

  const mutation = useMutation(
    orpc.task.move.mutationOptions({
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
          // An open drawer prints the card's column.
          queryClient.invalidateQueries({ queryKey: orpc.task.get.key() }),
          // Entering done stops the card's clocks (rule 3).
          queryClient.invalidateQueries({ queryKey: orpc.time.key() }),
        ]),
    }),
  );

  /** `forceComment` moves a blocked task into doing or done anyway, saying why (rule 4). */
  return ({
    taskId,
    columnId,
    position,
    forceComment,
  }: {
    taskId: string;
    columnId: string;
    position: string;
    forceComment?: string;
  }) => {
    void queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Board>(key);
    if (previous) {
      const tasks = previous.tasks
        .map((task) => (task.id === taskId ? { ...task, columnId, position } : task))
        .toSorted(byPosition);
      queryClient.setQueryData<Board>(key, { ...previous, tasks });
    }
    mutation.mutate(
      { projectId, taskId, columnId, position, forceComment },
      {
        onError: (error) => {
          if (previous) queryClient.setQueryData(key, previous);
          reportFailure({ error, fallback: m.task_move_failed() });
        },
      },
    );
  };
}

/*===== Status =====*/

/**
 * How the board shows a status action before the server answers. Start and pause light or put out the viewer's clock
 * on the card and leave it in place (others' clocks run on); done, stop and reopen send it to the bottom of their
 * column, and done and stop put its clocks out.
 */
function afterAction({
  task,
  action,
  target,
  last,
  viewerId,
}: {
  task: TaskCard;
  action: TaskStatusAction;
  target: Project["columns"][number] | undefined;
  last: TaskCard | undefined;
  viewerId: string;
}): TaskCard {
  const others = task.running.filter((clock) => clock.userId !== viewerId);
  if (action === "start") return { ...task, running: [...others, { userId: viewerId, since: new Date() }] };
  if (action === "pause") return { ...task, running: others };
  if (!target || task.columnId === target.id) return task;
  const moved = { ...task, columnId: target.id, position: positionBetween(last?.position ?? null, null) };
  return action === "reopen" ? moved : { ...moved, running: [] };
}

/** Starting a clock stops the viewer's clock on any other card (rule 2). */
const withoutViewerClock = ({ task, viewerId }: { task: TaskCard; viewerId: string }): TaskCard =>
  task.running.some((clock) => clock.userId === viewerId)
    ? { ...task, running: task.running.filter((clock) => clock.userId !== viewerId) }
    : task;

/**
 * Takes a status action on a task (start, pause, done, stop, reopen), from its card menu or its drawer. Like a move,
 * the board shows it at once (`afterAction`). A refused action puts the board back and says why. The drawer, the
 * task's time and the header's timer are refetched afterwards.
 */
export function useTaskTransition(project: Pick<Project, "id" | "columns">) {
  const queryClient = useQueryClient();
  const { viewer } = useRouteContext({ from: "/_site-layout/_app-layout" });
  const key = boardQuery(project.id).queryKey;

  const mutation = useMutation(
    orpc.task.transition.mutationOptions({
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.task.get.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.time.key() }),
        ]),
    }),
  );

  return ({
    taskId,
    action,
    reason,
    forceComment,
  }: {
    taskId: string;
    action: TaskStatusAction;
    reason?: string;
    forceComment?: string;
  }) => {
    void queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Board>(key);
    const target = isColumnAction(action)
      ? project.columns.find((column) => column.kind === COLUMN_ACTION_RULES[action].to)
      : undefined;
    if (previous) {
      const last = target && previous.tasks.findLast((task) => task.columnId === target.id && task.id !== taskId);
      const tasks = previous.tasks
        .map((task) =>
          task.id === taskId
            ? afterAction({ task, action, target, last, viewerId: viewer.id })
            : action === "start"
              ? withoutViewerClock({ task, viewerId: viewer.id })
              : task,
        )
        .toSorted(byPosition);
      queryClient.setQueryData<Board>(key, { ...previous, tasks });
    }
    mutation.mutate(
      { projectId: project.id, taskId, action, reason, forceComment },
      {
        onError: (error) => {
          if (previous) queryClient.setQueryData(key, previous);
          reportFailure({ error, fallback: m.task_status_failed() });
        },
      },
    );
  };
}

/*===== Column Move =====*/

/** Moves a column to a position key (admins only, which the server checks), the same way `useTaskMove` moves a card. */
export function useColumnMove({ projectId, projectKey }: { projectId: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const key = projectQuery(projectKey).queryKey;

  const mutation = useMutation(
    orpc.project.moveColumn.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.project.get.key() }),
    }),
  );

  return ({ columnId, position }: { columnId: string; position: string }) => {
    void queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Project>(key);
    if (previous) {
      const columns = previous.columns
        .map((column) => (column.id === columnId ? { ...column, position } : column))
        .toSorted(byPosition);
      queryClient.setQueryData<Project>(key, { ...previous, columns });
    }
    mutation.mutate(
      { projectId, columnId, position },
      {
        onError: (error) => {
          if (previous) queryClient.setQueryData(key, previous);
          reportFailure({ error, fallback: m.column_move_failed() });
        },
      },
    );
  };
}
