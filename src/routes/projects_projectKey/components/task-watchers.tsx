import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeIcon } from "lucide-react";

import { Toggle } from "#/components/primitive/toggle/toggle";
import { toast } from "#/components/primitive/toast/toast";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { describeApiFailure } from "#/lib/api-error";
import { client, orpc } from "#/orpc/client";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { taskQuery } from "#/routes/projects_projectKey/queries";

/*===== Task Watchers =====*/

/**
 * The drawer's watch key and the card's watchers (docs/task-manager-plan.md → slice 17). Anyone who can open the card
 * may watch it, a viewer too: watchers hear about its comments, status changes, hand-offs and archiving. The key
 * latches at once and is saved behind it; the board's eye follows.
 */
export function TaskWatchers({ task, projectId, viewerId }: { task: TaskDetail; projectId: string; viewerId: string }) {
  const queryClient = useQueryClient();
  const key = taskQuery({ projectId, number: task.number }).queryKey;
  const watching = task.watchers.some((person) => person.id === viewerId);

  const toggle = useMutation({
    mutationFn: (watch: boolean) =>
      watch
        ? client.watcher.watch({ projectId, taskId: task.id })
        : client.watcher.unwatch({ projectId, taskId: task.id }),
    onSuccess: (watchers) => queryClient.setQueryData(key, (current) => current && { ...current, watchers }),
    onError: (error) => {
      const failure = describeApiFailure({ error, fallback: m.watcher_failed() });
      toast.add({ title: failure.message ?? m.watcher_failed(), type: "error" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
  });
  // Shows the key's new state while it is saved; a failure falls back to the stored one.
  const pressed = toggle.isPending ? toggle.variables : watching;

  return (
    <section aria-labelledby="task-watchers-title" className="flex flex-col gap-3">
      <h3 id="task-watchers-title" className="text-body-sm font-semibold">
        {m.watcher_list()}
      </h3>
      {task.watchers.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {task.watchers.map((person) => (
            <li key={person.id}>
              <PersonAvatar name={person.name} src={person.avatarUrl} />
            </li>
          ))}
        </ul>
      )}
      <Toggle size="sm" className="self-start" pressed={pressed} onPressedChange={(next) => toggle.mutate(next)}>
        <EyeIcon data-icon="inline-start" />
        {m.watcher_watch()}
      </Toggle>
      <p className="text-caption text-muted-foreground">{m.watcher_watching_hint()}</p>
    </section>
  );
}
