import { ORPCError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import { positionBetween } from "#/lib/position";
import { STATUS_ACTION_RULES, type TaskStatusAction } from "#/orpc/task/constants";
import type { Board } from "#/orpc/task/contract";
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
          // Leaving doing stops the card's timers (rule 3).
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
 * Takes a status action on a task (start, pause, done, stop, reopen), from its card menu or its drawer. Like a move,
 * the board shows it at once: the card goes to the bottom of the action's column, lit as running after a start and
 * with its timers stopped after anything that leaves doing. A refused action puts the board back and says why. The
 * drawer, the task's time and the header's timer are refetched afterwards.
 */
export function useTaskTransition(project: Pick<Project, "id" | "columns">) {
  const queryClient = useQueryClient();
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
    const target = project.columns.find((column) => column.kind === STATUS_ACTION_RULES[action].to);
    if (previous && target) {
      const last = previous.tasks.findLast((task) => task.columnId === target.id && task.id !== taskId);
      const tasks = previous.tasks
        .map((task) => {
          if (task.id !== taskId) return task;
          const moved =
            task.columnId === target.id
              ? task
              : { ...task, columnId: target.id, position: positionBetween(last?.position ?? null, null) };
          if (action === "start")
            return { ...moved, runningSince: task.runningSince.length > 0 ? task.runningSince : [new Date()] };
          return { ...moved, runningSince: [] };
        })
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
