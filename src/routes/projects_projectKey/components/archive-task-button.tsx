import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/primitive/dialog/dialog";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";

/*===== Archive =====*/

/** Takes the task off the board after a confirmation. It keeps its history and can be found in the archive. */
export function ArchiveTaskButton({
  projectId,
  task,
  code,
  onArchived,
}: {
  projectId: string;
  task: TaskDetail;
  code: string;
  onArchived: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const archive = useMutation(
    orpc.task.archive.mutationOptions({
      onSuccess: async () => {
        setOpen(false);
        toast.add({ title: m.task_archived({ code }), type: "success" });
        onArchived();
        // Archiving stops the task's timers, which the header shows.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.time.key() }),
        ]);
      },
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.task_save_failed() });
        toast.add({ title: failure.message ?? m.task_save_failed(), type: "error" });
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ArchiveIcon data-icon="inline-start" />
        {m.task_archive()}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.task_archive_title({ code })}</DialogTitle>
          <DialogDescription>{m.task_archive_description()}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button disabled={archive.isPending} onClick={() => archive.mutate({ projectId, taskId: task.id })}>
            {archive.isPending && <Spinner data-icon="inline-start" />}
            {m.task_archive()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
