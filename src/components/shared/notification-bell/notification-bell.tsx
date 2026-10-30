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
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { formatDate, formatNumber, isoToDate } from "#/lib/locale";
import { orpc } from "#/orpc/client";
import { useLiveConnected } from "#/hooks/use-live-updates";
import { NOTIFICATION_POLL_MS } from "#/orpc/notification/constants";
import type { Notification } from "#/orpc/notification/contract";
import { m } from "#/paraglide/messages";

/*===== Wording =====*/

/** The notification as a sentence: who did what to which task, or which task's due date came. */
function sentenceOf(item: Notification): string {
  const code = item.taskCode;
  const name = item.actorName ?? "";
  switch (item.kind) {
    case "assigned":
      return m.notification_assigned({ name, code });
    case "delegated":
      return m.notification_delegated({ name, code });
    case "mentioned":
      return m.notification_mentioned({ name, code });
    case "unblocked":
      return m.notification_unblocked({ code, blocker: item.note ?? "" });
    case "due_soon":
      return m.notification_due_soon({ code, date: item.dueDate ? formatDate(isoToDate(item.dueDate)) : "" });
    case "overdue":
      return m.notification_overdue({ code, date: item.dueDate ? formatDate(isoToDate(item.dueDate)) : "" });
  }
}

/**
 * The bell's polling query: the site layout loads it first, and it asks again every half minute. The bell itself stops
 * asking while the live stream is open, which tells it about new ones.
 */
export const notificationsQuery = () => orpc.notification.list.queryOptions({ refetchInterval: NOTIFICATION_POLL_MS });

/*===== Notification Bell =====*/

/**
 * The viewer's notifications, in the header on every page (docs/app.md → Notification): a key with a bell that lights
 * an orange LED and prints the count while some are unread, opening the latest as a list. Each one opens its task and
 * is marked read; "mark all read" clears the rest. While the page holds the live stream open, a new one shows at once;
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
            variant="secondary"
            size={data.unread > 0 ? "sm" : "icon-sm"}
            aria-label={data.unread > 0 ? m.notification_open_unread({ count: data.unread }) : m.notification_open()}
          />
        }
      >
        <BellIcon />
        {data.unread > 0 && (
          <>
            <Led signal="attention" state="on" size="sm" />
            <span aria-hidden="true">{formatNumber(data.unread)}</span>
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
                    <span className="text-body-sm">{sentenceOf(item)}</span>
                    <span className="truncate text-body-sm text-muted-foreground">{item.taskTitle}</span>
                    {item.kind === "delegated" && item.note && (
                      <span className="line-clamp-2 text-caption text-muted-foreground">{item.note}</span>
                    )}
                    <Marking>{formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</Marking>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{m.notification_empty()}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
