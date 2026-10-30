import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { taskQuery } from "#/routes/projects_projectKey/queries";

/*===== Task Update =====*/

type Change = Omit<Parameters<typeof orpc.task.update.call>[0], "projectId" | "taskId">;

/**
 * Saves changes to one task from its drawer. The drawer shows a change at once (`onMutate` writes it into the task's
 * cached details), puts the old value back with a toast if the server refuses it, and refetches the board afterwards,
 * since the card shows some of the same fields.
 */
export function useTaskUpdate({ projectId, task }: { projectId: string; task: TaskDetail }) {
  const queryClient = useQueryClient();
  const key = taskQuery({ projectId, number: task.number }).queryKey;

  const mutation = useMutation(
    orpc.task.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<TaskDetail>(key);
        // The description is saved as typed; its stored form only comes back from the server.
        const { projectId: _project, taskId: _task, description: _description, ...fields } = variables;
        if (previous) queryClient.setQueryData<TaskDetail>(key, { ...previous, ...fields });
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) queryClient.setQueryData(key, context.previous);
        const failure = describeApiFailure({ error, fallback: m.task_save_failed() });
        toast.add({
          title: failure.message ?? Object.values(failure.fields)[0] ?? m.task_save_failed(),
          type: "error",
        });
      },
      onSuccess: (saved) => queryClient.setQueryData(key, saved),
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
    }),
  );

  return {
    save: (change: Change) => mutation.mutate({ projectId, taskId: task.id, ...change }),
    saveAsync: (change: Change) => mutation.mutateAsync({ projectId, taskId: task.id, ...change }),
    isPending: mutation.isPending,
  };
}
