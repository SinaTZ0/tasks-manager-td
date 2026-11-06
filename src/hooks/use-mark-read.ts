import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";

/*===== Mark Read =====*/

/** Marks notifications read: `{ ids }` for some, `{}` for all. A failure says so in a toast. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.notification.markRead.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.notification.key() }),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.notification_mark_failed() });
        toast.add({ title: failure.message ?? m.notification_mark_failed(), type: "error" });
      },
    }),
  );
}
