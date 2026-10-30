import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import type { Board } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { boardQuery, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Helpers =====*/

/** Keys compare byte-wise (`src/lib/position.ts`), the way the server orders them. */
const byPosition = (a: { position: string }, b: { position: string }) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

/** Shows why a move was refused, or the fallback when the server gave no reason. */
function reportFailure({ error, fallback }: { error: unknown; fallback: string }) {
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
        ]),
    }),
  );

  return ({ taskId, columnId, position }: { taskId: string; columnId: string; position: string }) => {
    void queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Board>(key);
    if (previous) {
      const tasks = previous.tasks
        .map((task) => (task.id === taskId ? { ...task, columnId, position } : task))
        .toSorted(byPosition);
      queryClient.setQueryData<Board>(key, { ...previous, tasks });
    }
    mutation.mutate(
      { projectId, taskId, columnId, position },
      {
        onError: (error) => {
          if (previous) queryClient.setQueryData(key, previous);
          reportFailure({ error, fallback: m.task_move_failed() });
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
