import { Button } from "#/components/primitive/button/button";
import { Marking } from "#/components/primitive/marking/marking";
import { toast } from "#/components/primitive/toast/toast";
import { useReminderChanges } from "#/hooks/use-reminders";
import { stepLabel, tomorrowMorning, whenLabel } from "#/lib/reminder-time";
import { cn } from "#/lib/utils";
import type { Notification } from "#/orpc/notification/contract";
import { m } from "#/paraglide/messages";

/*===== Reminder Snooze =====*/

const SNOOZE_MINUTES = 60;

/** Whether a notification is a reminder that can still be put off: an archived card takes no reminder. */
export const canSnooze = (item: Notification) => item.kind === "reminder" && !!item.taskId && item.event !== "archived";

/**
 * The keys under a reminder that rang: remind me again in an hour, or tomorrow morning. Each one sets a fresh reminder
 * on the card with the same note, and settles the notification.
 */
export function ReminderSnooze({
  item,
  taskId,
  onSnoozed,
  className,
}: {
  item: Notification;
  taskId: string;
  onSnoozed: () => void;
  className?: string;
}) {
  const { set } = useReminderChanges();

  const again = (remindAt: Date) =>
    set.mutate(
      { projectId: item.projectId, taskId, remindAt, note: item.note ?? undefined },
      {
        onSuccess: () => {
          onSnoozed();
          toast.add({ title: m.reminder_snoozed({ when: whenLabel(remindAt) }), type: "success" });
        },
      },
    );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Marking>{m.reminder_snooze_lead()}</Marking>
      <Button
        variant="secondary"
        size="xs"
        aria-label={m.reminder_snooze({ code: item.taskCode, time: stepLabel(SNOOZE_MINUTES) })}
        disabled={set.isPending}
        onClick={() => again(new Date(Date.now() + SNOOZE_MINUTES * 60_000))}
      >
        {stepLabel(SNOOZE_MINUTES)}
      </Button>
      <Button
        variant="secondary"
        size="xs"
        aria-label={m.reminder_snooze({ code: item.taskCode, time: m.reminder_tomorrow() })}
        disabled={set.isPending}
        onClick={() => again(tomorrowMorning())}
      >
        {m.reminder_tomorrow()}
      </Button>
    </div>
  );
}
