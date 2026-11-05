import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { useLiveConnected } from "#/hooks/use-live-updates";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import { NOTIFICATION_POLL_MS } from "#/orpc/notification/constants";
import type { Reminder } from "#/orpc/reminder/contract";
import { m } from "#/paraglide/messages";

/*===== Reminders =====*/

/** The viewer's waiting reminders: the project layout and My Tasks load them. */
export const remindersQuery = () => orpc.reminder.mine.queryOptions();

/**
 * The viewer's waiting reminders, soonest first. One that fires leaves the list: the live stream says so, and without
 * the stream it is asked for again as often as the bell.
 */
export function useReminders(): Reminder[] {
  const live = useLiveConnected();
  const { data } = useSuspenseQuery({ ...remindersQuery(), refetchInterval: live ? false : NOTIFICATION_POLL_MS });
  return data;
}

/*===== Changes =====*/

/** Run one at a time: the key saves on every press, and a slow earlier press mustn't land after a later one. */
const IN_ORDER = { scope: { id: "reminder" } };

function onError(error: unknown) {
  const failure = describeApiFailure({ error, fallback: m.reminder_save_failed() });
  toast.add({ title: failure.message ?? m.reminder_save_failed(), type: "error" });
}

/** Keys to set and clear the viewer's reminders. A failure says so in a toast. */
export function useReminderChanges() {
  const queryClient = useQueryClient();

  // Only after the last one in line: reading between presses would put an older time back on the card for a moment.
  const onSettled = () => {
    if (queryClient.isMutating({ mutationKey: orpc.reminder.key() }) > 1) return;
    return queryClient.invalidateQueries({ queryKey: orpc.reminder.key() });
  };

  return {
    set: useMutation(orpc.reminder.set.mutationOptions({ ...IN_ORDER, onError, onSettled })),
    clear: useMutation(orpc.reminder.clear.mutationOptions({ ...IN_ORDER, onError, onSettled })),
  };
}
