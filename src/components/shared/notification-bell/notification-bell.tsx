import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/primitive/popover/popover";
import { Switch } from "#/components/primitive/switch/switch";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate, formatNumber } from "#/lib/locale";
import { notificationDetail, notificationSentence } from "#/lib/notification-text";
import { stepLabel, tomorrowMorning, whenLabel } from "#/lib/reminder-time";
import { orpc } from "#/orpc/client";
import { useLiveConnected } from "#/hooks/use-live-updates";
import { usePush } from "#/hooks/use-push";
import { useReminderChanges } from "#/hooks/use-reminders";
import { NOTIFICATION_POLL_MS } from "#/orpc/notification/constants";
import type { Notification } from "#/orpc/notification/contract";
import { m } from "#/paraglide/messages";

/**
 * The bell's polling query: the site layout loads it first, and it asks again every half minute. The bell itself stops
 * asking while the live stream is open, which tells it about new ones.
 */
export const notificationsQuery = () => orpc.notification.list.queryOptions({ refetchInterval: NOTIFICATION_POLL_MS });

/*===== Push Switch =====*/

const PUSH_SWITCH_ID = "push-switch";

/**
 * "Notify me on this computer": turns this browser's push subscription on or off (`usePush`). Hidden where the browser
 * can't; says so where it blocks Tofang's notifications.
 */
function PushSwitch() {
  const { state, enable, disable } = usePush();
  const [busy, setBusy] = useState(false);
  if (state === null || state === "unsupported") return null;

  const change = async (on: boolean) => {
    setBusy(true);
    try {
      await (on ? enable() : disable());
    } catch {
      toast.add({ title: m.push_failed(), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-3">
      {/* The label wraps the switch, so the whole row is its tap target. */}
      <label htmlFor={PUSH_SWITCH_ID} className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-body-sm font-semibold">{m.push_toggle()}</span>
        <Switch
          id={PUSH_SWITCH_ID}
          size="sm"
          checked={state === "on"}
          disabled={busy || state === "blocked"}
          onCheckedChange={(checked) => void change(checked)}
          aria-describedby={`${PUSH_SWITCH_ID}-hint`}
        />
      </label>
      <p id={`${PUSH_SWITCH_ID}-hint`} className="text-caption text-muted-foreground">
        {state === "blocked" ? m.push_blocked() : m.push_toggle_hint()}
      </p>
    </div>
  );
}

/*===== Snooze =====*/

const SNOOZE_MINUTES = 60;

/**
 * The keys under a reminder that rang: remind me again in an hour, or tomorrow morning. Each one sets a fresh reminder
 * on the card with the same note, and settles the notification.
 */
function Snooze({ item, taskId, onSnoozed }: { item: Notification; taskId: string; onSnoozed: () => void }) {
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
    <div className="flex items-center gap-2 ps-7 pb-2">
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

/*===== Notification Bell =====*/

/**
 * The viewer's notifications, in the header on every page (docs/app.md → Notification): a bell on the glass that lights
 * a yellow LED and prints the count while some are unread, opening the latest as a list. Each one opens its task and
 * is marked read; "mark all read" clears the rest. A reminder can be put off from here. While the page holds the live stream open, a new one shows at once;
 * otherwise the list is asked for again every half minute (`NOTIFICATION_POLL_MS`).
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const live = useLiveConnected();
  const { data } = useSuspenseQuery({ ...notificationsQuery(), refetchInterval: live ? false : NOTIFICATION_POLL_MS });

  const markRead = useMutation(
    orpc.notification.markRead.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.notification.key() }),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.notification_mark_failed() });
        toast.add({ title: failure.message ?? m.notification_mark_failed(), type: "error" });
      },
    }),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="glass"
            size={data.unread > 0 ? "sm" : "icon-sm"}
            aria-label={data.unread > 0 ? m.notification_open_unread({ count: data.unread }) : m.notification_open()}
          />
        }
      >
        <BellIcon />
        {data.unread > 0 && (
          <>
            <Led signal="attention" state="on" size="sm" />
            <span aria-hidden="true" className="font-mono text-body-sm text-glass-foreground">
              {formatNumber(data.unread)}
            </span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        {/*------ Header ------*/}
        <PopoverHeader className="flex-row items-center justify-between">
          <PopoverTitle>{m.notification_title()}</PopoverTitle>
          {data.unread > 0 && (
            <Button variant="ghost" size="xs" disabled={markRead.isPending} onClick={() => markRead.mutate({})}>
              <CheckCheckIcon data-icon="inline-start" />
              {m.notification_mark_all()}
            </Button>
          )}
        </PopoverHeader>

        {/*------ List ------*/}
        {data.items.length > 0 ? (
          <ul className="-mx-2 flex max-h-96 flex-col overflow-y-auto">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  to="/projects/$projectKey"
                  params={{ projectKey: item.projectKey }}
                  search={{ task: item.taskCode }}
                  onClick={() => {
                    if (!item.read) markRead.mutate({ ids: [item.id] });
                    setOpen(false);
                  }}
                  className="flex gap-3 rounded-chassis px-2 py-2.5 outline-none hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <Led
                    signal="attention"
                    state={item.read ? "off" : "on"}
                    size="sm"
                    label={item.read ? undefined : m.notification_unread()}
                    className="mt-1.5 shrink-0"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-sm">{notificationSentence(item)}</span>
                    <span className="truncate text-body-sm text-muted-foreground">{item.taskTitle}</span>
                    {notificationDetail(item) && (
                      <span className="line-clamp-2 text-caption text-muted-foreground">
                        {notificationDetail(item)}
                      </span>
                    )}
                    <Marking>{formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</Marking>
                  </span>
                </Link>
                {/* An archived card takes no reminder. Beside the link, since a key can't sit inside one. */}
                {item.kind === "reminder" && item.taskId && item.event !== "archived" && (
                  <Snooze
                    item={item}
                    taskId={item.taskId}
                    onSnoozed={() => {
                      if (!item.read) markRead.mutate({ ids: [item.id] });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{m.notification_empty()}</p>
        )}

        {/*------ This Computer ------*/}
        <PushSwitch />
      </PopoverContent>
    </Popover>
  );
}
