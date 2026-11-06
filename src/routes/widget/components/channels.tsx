import { useSuspenseQuery } from "@tanstack/react-query";
import { BellIcon, CheckCheckIcon, ChevronDownIcon, ClockIcon, ListTodoIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { notificationsQuery } from "#/components/shared/notification-bell/notification-bell";
import { useLiveConnected } from "#/hooks/use-live-updates";
import { useMarkRead } from "#/hooks/use-mark-read";
import { useNow } from "#/hooks/use-now";
import { useReminders } from "#/hooks/use-reminders";
import { useSignOut } from "#/hooks/use-sign-out";
import { formatNumber } from "#/lib/locale";
import { notificationSentence } from "#/lib/notification-text";
import { teamToday } from "#/lib/team-day";
import { orpc } from "#/orpc/client";
import { NOTIFICATION_POLL_MS } from "#/orpc/notification/constants";
import type { Notification } from "#/orpc/notification/contract";
import { m } from "#/paraglide/messages";

import { tellShell } from "../bridge";
import { useArrivals } from "../hooks/use-arrivals";
import { useShellEvents } from "../hooks/use-shell-events";
import { isToday, withoutRepeats } from "../today";
import { NotificationRow, ReminderRow, TaskRow } from "./rows";

/*===== Toasts =====*/

/** More than this at once (the machine woke up, say) rings as one toast, not a stack of them. */
const TOASTS_AT_ONCE = 3;

function ring(fresh: Notification[]) {
  if (fresh.length > TOASTS_AT_ONCE) {
    tellShell({ type: "toast", title: m.widget_toast_many({ count: fresh.length }), body: "" });
    return;
  }
  for (const item of fresh) tellShell({ type: "toast", title: notificationSentence(item), body: item.taskTitle });
}

/*===== Channels =====*/

type Channel = "today" | "news" | "reminders";

/**
 * The widget (docs/desktop.md): three channel keys and one list at a time. Collapsed, the window is just the keys in a
 * row; a key opens its channel. Something new opens the window on the channel that shows it, and holds it above the
 * other windows for a moment. A viewer can't be assigned tasks, so they have no Today key.
 */
export function Channels({ canHaveTasks }: { canHaveTasks: boolean }) {
  const live = useLiveConnected();
  const pollWhenDown = { refetchInterval: live ? (false as const) : NOTIFICATION_POLL_MS };
  const { data: list } = useSuspenseQuery({ ...notificationsQuery(), ...pollWhenDown });
  const { data: tasks } = useSuspenseQuery({ ...orpc.task.mine.queryOptions(), ...pollWhenDown });
  const reminders = useReminders();
  const markRead = useMarkRead();
  const signOut = useSignOut({ to: "/widget" });

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(canHaveTasks ? "today" : "news");
  const [updateReady, setUpdateReady] = useState(false);

  /*------ Lists ------*/
  // Asked again every second by `useNow`, so an open window turns over at the team's midnight.
  const now = useNow();
  const day = teamToday(now ?? undefined);
  const today = tasks.filter((task) => isToday({ task, today: day }));
  const news = withoutRepeats({ items: list.items, today });
  const unread = news.filter((item) => !item.read).length;

  const keys = [
    ...(canHaveTasks
      ? [
          {
            id: "today" as const,
            icon: ListTodoIcon,
            label: m.widget_today(),
            count: today.length,
            signal: "positive" as const,
          },
        ]
      : []),
    { id: "news" as const, icon: BellIcon, label: m.notification_title(), count: unread, signal: "attention" as const },
    {
      id: "reminders" as const,
      icon: ClockIcon,
      label: m.reminder_list_title(),
      count: reminders.length,
      signal: "action" as const,
    },
  ];

  /*------ The Shell ------*/
  useEffect(() => tellShell({ type: "size", mode: open ? "open" : "strip" }), [open]);

  useArrivals({
    items: list.items,
    onArrive: (fresh) => {
      ring(fresh);
      // A due-date alert about a listed task isn't on the news channel, so show the list that has it.
      setChannel(fresh.some((item) => news.includes(item)) ? "news" : canHaveTasks ? "today" : "news");
      setOpen(true);
      tellShell({ type: "raise" });
    },
  });

  useShellEvents((event) => {
    if (event.type === "show") setOpen(true);
    if (event.type === "update-ready") setUpdateReady(true);
    if (event.type === "sign-out") signOut.mutate();
  });

  /*------ Collapsed ------*/
  if (!open) {
    return (
      <main data-widget className="flex h-svh w-full items-center gap-1.5 bg-card surface-grain p-1.5">
        {keys.map((key) => (
          <Button
            key={key.id}
            variant="secondary"
            size="sm"
            className="h-full flex-1"
            aria-label={`${key.label} ${formatNumber(key.count)}`}
            onClick={() => {
              setChannel(key.id);
              setOpen(true);
            }}
          >
            <key.icon data-icon="inline-start" />
            <Led signal={key.signal} state={key.count > 0 ? "on" : "off"} size="sm" />
            {/* Persian's zero is a dot, which beside an unlit LED reads as a second LED. */}
            {key.count > 0 && <span className="font-mono">{formatNumber(key.count)}</span>}
          </Button>
        ))}
      </main>
    );
  }

  /*------ Open ------*/
  const shown = { today: today.length, news: news.length, reminders: reminders.length }[channel];
  const empty = { today: m.widget_today_empty, news: m.notification_empty, reminders: m.widget_reminders_empty }[
    channel
  ];

  return (
    <main data-widget className="flex h-svh gap-1.5 bg-card surface-grain p-1.5 text-card-foreground">
      {/*------ Keys ------*/}
      <div className="flex w-20 shrink-0 flex-col gap-1.5">
        {keys.map((key) => (
          <Button
            key={key.id}
            variant={channel === key.id ? "default" : "secondary"}
            aria-pressed={channel === key.id}
            onClick={() => setChannel(key.id)}
            size="pad"
          >
            <span className="flex items-center gap-1.5">
              <Led signal={key.signal} state={key.count > 0 ? "on" : "off"} size="sm" />
              {key.count > 0 && <span className="font-mono text-body">{formatNumber(key.count)}</span>}
            </span>
            <span className="text-marking">{key.label}</span>
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          aria-label={m.widget_collapse()}
          onClick={() => setOpen(false)}
        >
          <ChevronDownIcon />
        </Button>
      </div>

      {/*------ List ------*/}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {updateReady && (
          <div className="flex items-center justify-between gap-2 px-1">
            <Marking>{m.widget_update_ready()}</Marking>
            <Button variant="highlight" size="xs" onClick={() => tellShell({ type: "restart" })}>
              {m.widget_update_restart()}
            </Button>
          </div>
        )}
        {channel === "news" && unread > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="xs" disabled={markRead.isPending} onClick={() => markRead.mutate({})}>
              <CheckCheckIcon data-icon="inline-start" />
              {m.notification_mark_all()}
            </Button>
          </div>
        )}
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto striped rounded-chassis bg-tray px-2.5 shadow-tray">
          {channel === "today" && today.map((task) => <TaskRow key={task.id} task={task} />)}
          {channel === "news" && news.map((item) => <NotificationRow key={item.id} item={item} />)}
          {channel === "reminders" &&
            reminders.map((reminder) => <ReminderRow key={reminder.taskId} reminder={reminder} />)}
          {shown === 0 && <li className="m-auto text-center text-body-sm text-muted-foreground">{empty()}</li>}
        </ul>
      </div>
    </main>
  );
}
