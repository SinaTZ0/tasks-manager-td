import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "#/components/primitive/button/button";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { DueMark } from "#/components/shared/due-mark/due-mark";
import { canSnooze, ReminderSnooze } from "#/components/shared/reminder-snooze/reminder-snooze";
import { useMarkRead } from "#/hooks/use-mark-read";
import { cardPath } from "#/lib/card-path";
import { columnTitle } from "#/lib/column-title";
import { notificationDetail, notificationSentence } from "#/lib/notification-text";
import { whenLabel } from "#/lib/reminder-time";
import type { Notification } from "#/orpc/notification/contract";
import type { Reminder } from "#/orpc/reminder/contract";
import { taskCode } from "#/orpc/task/constants";
import type { MyTask } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { getLocale } from "#/paraglide/runtime";

import { openInBrowser } from "../bridge";

/*===== Row =====*/

function OpenKey({ code, onOpen }: { code: string; onOpen: () => void }) {
  return (
    <Button variant="ghost" size="icon-xs" aria-label={m.widget_open_card({ code })} onClick={onOpen}>
      <ExternalLinkIcon />
    </Button>
  );
}

/** A row's frame: an LED, its text, and the keys at its end. */
function Row({ led, keys, children }: { led: ReactNode; keys: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className="mt-1.5 flex shrink-0">{led}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
      <span className="flex shrink-0 items-center">{keys}</span>
    </li>
  );
}

const openCard = ({ projectKey, code }: { projectKey: string; code: string }) =>
  openInBrowser(cardPath({ locale: getLocale(), projectKey, taskCode: code }));

/*===== Notification =====*/

/** One notification. Opening its card marks it read; a reminder that rang can be put off from here. */
export function NotificationRow({ item }: { item: Notification }) {
  const markRead = useMarkRead();
  const detail = notificationDetail(item);
  const settle = () => {
    if (!item.read) markRead.mutate({ ids: [item.id] });
  };

  return (
    <Row
      led={
        <Led
          signal="attention"
          state={item.read ? "off" : "on"}
          size="sm"
          label={item.read ? undefined : m.notification_unread()}
        />
      }
      keys={
        <>
          {!item.read && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.widget_mark_read({ code: item.taskCode })}
              disabled={markRead.isPending}
              onClick={settle}
            >
              <CheckIcon />
            </Button>
          )}
          <OpenKey
            code={item.taskCode}
            onOpen={() => {
              settle();
              openCard({ projectKey: item.projectKey, code: item.taskCode });
            }}
          />
        </>
      }
    >
      <span className="text-body-sm">{notificationSentence(item)}</span>
      <span className="truncate text-caption text-muted-foreground">{item.taskTitle}</span>
      {detail && <span className="truncate text-caption text-muted-foreground">{detail}</span>}
      {canSnooze(item) && item.taskId && (
        <ReminderSnooze item={item} taskId={item.taskId} className="pt-1" onSnoozed={settle} />
      )}
    </Row>
  );
}

/*===== Task =====*/

export function TaskRow({ task }: { task: MyTask }) {
  const code = taskCode({ key: task.projectKey, number: task.number });
  return (
    <Row
      led={<Led signal="positive" state={task.columnKind === "doing" ? "on" : "off"} size="sm" />}
      keys={<OpenKey code={code} onOpen={() => openCard({ projectKey: task.projectKey, code })} />}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <Marking variant="code">{code}</Marking>
        <span className="truncate text-body-sm font-semibold">{task.title}</span>
      </span>
      <span className="flex items-center gap-2 text-caption text-muted-foreground">
        {columnTitle({ kind: task.columnKind, name: task.columnName })}
        {task.dueDate && <DueMark dueDate={task.dueDate} brief />}
      </span>
    </Row>
  );
}

/*===== Reminder =====*/

export function ReminderRow({ reminder }: { reminder: Reminder }) {
  return (
    <Row
      led={<Led signal="action" state="on" size="sm" />}
      keys={
        <OpenKey
          code={reminder.taskCode}
          onOpen={() => openCard({ projectKey: reminder.projectKey, code: reminder.taskCode })}
        />
      }
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <Marking variant="code">{reminder.taskCode}</Marking>
        <span className="truncate text-body-sm font-semibold">{reminder.taskTitle}</span>
      </span>
      <span className="truncate text-caption text-muted-foreground">
        {whenLabel(reminder.remindAt)}
        {reminder.note ? ` · ${reminder.note}` : ""}
      </span>
    </Row>
  );
}
