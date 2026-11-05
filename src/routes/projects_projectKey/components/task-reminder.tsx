import { BellIcon, CalendarClockIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/primitive/button/button";
import { DatePicker } from "#/components/primitive/date-picker/date-picker";
import { Field, FieldError, FieldLabel } from "#/components/primitive/field/field";
import { Input } from "#/components/primitive/input/input";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/primitive/popover/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { toast } from "#/components/primitive/toast/toast";
import { useNow } from "#/hooks/use-now";
import { usePush } from "#/hooks/use-push";
import { useReminderChanges, useReminders } from "#/hooks/use-reminders";
import { formatNumber } from "#/lib/locale";
import { leftLabel, stepLabel, whenLabel } from "#/lib/reminder-time";
import { teamMoment, teamTime, teamToday } from "#/lib/team-day";
import { REMINDER_MORNING, REMINDER_NOTE_MAX_LENGTH, REMINDER_STEPS } from "#/orpc/reminder/constants";
import type { Reminder } from "#/orpc/reminder/contract";
import { m } from "#/paraglide/messages";

/*===== Card Keys =====*/

/** The id of what opens a card's reminder, its key or its clip, for handing focus back when the panel closes. */
export const reminderKeyId = (taskId: string) => `task-reminder-${taskId}`;

/** Pressing either one opens the panel by the card; it must not also pick the card up. */
const keepCardStill = (event: { stopPropagation: () => void }) => event.stopPropagation();

/** The key on a card with no reminder, printed with the card's other handles. */
export function ReminderKey({
  taskId,
  code,
  onPress,
}: {
  taskId: string;
  code: string;
  /** Gets the card, for the panel to open beside. */
  onPress: (card: Element | null) => void;
}) {
  return (
    <Button
      id={reminderKeyId(taskId)}
      variant="ghost"
      size="icon-xs"
      aria-label={m.reminder_open_card({ code })}
      onPointerDown={keepCardStill}
      onClick={(event) => onPress(event.currentTarget.closest("article"))}
    >
      <BellIcon />
    </Button>
  );
}

/** Stands proud of the card's top edge beside the priority meter, as tall as the meter and with its rim. */
const CLIP_CLASSES =
  "absolute end-14 -top-0.5 z-20 flex h-4 items-center gap-1 rounded-xs bg-glass px-1.5 text-caption leading-none text-glass-foreground shadow-led-bezel";

/**
 * The private mark on a card with a reminder: a clip of display glass printing the time left. Only its person is sent
 * it. Without `onPress` (the copy being dragged) it is only a mark. The time is drawn once the page runs (`useNow`).
 */
export function ReminderClip({
  reminder,
  onPress,
}: {
  reminder: Reminder;
  /** Gets the card, for the panel to open beside. */
  onPress?: (card: Element | null) => void;
}) {
  const now = useNow();
  const face = (
    <>
      <Led signal="action" state="on" size="sm" />
      {now !== null && <bdi dir="ltr">{leftLabel({ at: reminder.remindAt, now })}</bdi>}
    </>
  );
  if (!onPress) return <span className={CLIP_CLASSES}>{face}</span>;

  return (
    <button
      type="button"
      id={reminderKeyId(reminder.taskId)}
      aria-label={m.reminder_mark({ code: reminder.taskCode, when: whenLabel(reminder.remindAt) })}
      onPointerDown={keepCardStill}
      onClick={(event) => onPress(event.currentTarget.closest("article"))}
      // The clip is shorter than a finger, so its hit area reaches past it.
      className={`${CLIP_CLASSES} outline-none after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
    >
      {face}
    </button>
  );
}

/*===== Picked Time =====*/

type PickedTime = { date: string | null; hour: string; minute: string };

const MINUTE_GAP = 5;

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** The fields' first reading: the reminder's own time on the team's clock, or the morning of a day still to pick. */
function pickedFrom(reminder: Reminder | undefined): PickedTime {
  const [hour = "09", minute = "00"] = (reminder ? teamTime(reminder.remindAt) : REMINDER_MORNING).split(":");
  return {
    date: reminder ? teamToday(reminder.remindAt) : null,
    hour,
    // The list goes in steps, and a stepped reminder lands on any minute.
    minute: twoDigits(Math.floor(Number(minute) / MINUTE_GAP) * MINUTE_GAP),
  };
}

/** One half of the clock, as a list: 24-hour and in the reader's digits, so nothing depends on the browser's locale. */
function ClockSelect({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: number[];
  value: string;
  onChange: (value: string) => void;
}) {
  const items = values.map((item) => ({
    value: twoDigits(item),
    label: formatNumber(item, { minimumIntegerDigits: 2 }),
  }));

  return (
    <Select items={items} value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 / MINUTE_GAP }, (_, index) => index * MINUTE_GAP);

/*===== Panel =====*/

/** Whether the browser can still be asked for notifications, as a key under the reminder. */
function PushOffer() {
  const { state, enable } = usePush();
  if (state !== "off") return null;

  return (
    <div className="flex flex-col items-start gap-1.5 border-t border-border pt-3">
      <p className="text-caption text-muted-foreground">{m.reminder_push_hint()}</p>
      <Button
        variant="secondary"
        size="xs"
        onClick={() => void enable().catch(() => toast.add({ title: m.push_failed(), type: "error" }))}
      >
        {m.push_toggle()}
      </Button>
    </div>
  );
}

/**
 * Setting the viewer's reminder on one card (docs/app.md → Reminders). Everything saves as it is chosen, with nothing
 * to confirm. The key prints 30 minutes and each press moves it on, round to 30 after the last step, each counted from
 * the press; the other way is a date and a time on the team's clock. The note goes with whichever is set, and on its
 * own when the field is left.
 */
export function ReminderPanel({
  projectId,
  taskId,
  code,
  onCleared,
}: {
  projectId: string;
  taskId: string;
  code: string;
  onCleared: () => void;
}) {
  const reminder = useReminders().find((item) => item.taskId === taskId);
  const { set, clear } = useReminderChanges();
  /** Which of `REMINDER_STEPS` the key is on; null until it is pressed. */
  const [step, setStep] = useState<number | null>(null);
  const [picked, setPicked] = useState<PickedTime | null>(null);
  const [past, setPast] = useState(false);
  const [note, setNote] = useState(reminder?.note ?? "");

  const save = (remindAt: Date) => set.mutate({ projectId, taskId, remindAt, note });

  const pressStep = () => {
    const next = step === null ? 0 : (step + 1) % REMINDER_STEPS.length;
    setStep(next);
    setPicked(null);
    setPast(false);
    save(new Date(Date.now() + (REMINDER_STEPS[next] ?? 0) * 60_000));
  };

  const pick = (next: PickedTime) => {
    setPicked(next);
    if (!next.date) return setPast(false);
    const at = teamMoment({ date: next.date, time: `${next.hour}:${next.minute}` });
    const passed = at.getTime() <= Date.now();
    setPast(passed);
    if (passed) return;
    setStep(null);
    save(at);
  };

  const saveNote = () => {
    if (reminder && note !== (reminder.note ?? "")) save(reminder.remindAt);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-heading text-h4">
          <BellIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          {m.reminder_title()}
        </span>
        <Marking variant="code">{code}</Marking>
      </div>

      {/*------ The Two Ways ------*/}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          aria-label={m.reminder_step_key({ time: stepLabel(REMINDER_STEPS[step ?? 0] ?? 0) })}
          onClick={pressStep}
        >
          <Led signal="action" state={step === null ? "off" : "on"} size="sm" />
          {stepLabel(REMINDER_STEPS[step ?? 0] ?? 0)}
        </Button>
        <Button
          variant={picked ? "default" : "secondary"}
          aria-expanded={picked !== null}
          onClick={() => {
            setPicked(picked ? null : pickedFrom(reminder));
            setPast(false);
          }}
        >
          <CalendarClockIcon />
          {m.reminder_date_time()}
        </Button>
      </div>

      {/*------ Date and Time ------*/}
      {picked && (
        <div className="flex flex-col gap-2">
          <DatePicker value={picked.date} onChange={(date) => pick({ ...picked, date })} />
          {/* Hour then minute, in that order in both languages, as a clock reads. */}
          <div dir="ltr" className="grid grid-cols-2 gap-2">
            <ClockSelect
              label={m.reminder_hour()}
              values={HOURS}
              value={picked.hour}
              onChange={(hour) => pick({ ...picked, hour })}
            />
            <ClockSelect
              label={m.reminder_minute()}
              values={MINUTES}
              value={picked.minute}
              onChange={(minute) => pick({ ...picked, minute })}
            />
          </div>
          {past && <FieldError>{m.reminder_error_past()}</FieldError>}
        </div>
      )}

      {/*------ Note ------*/}
      <Input
        aria-label={m.reminder_note_placeholder()}
        placeholder={m.reminder_note_placeholder()}
        maxLength={REMINDER_NOTE_MAX_LENGTH}
        autoComplete="off"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={saveNote}
        onKeyDown={(event) => {
          // Escape too: it closes the panel, and the field goes before it could lose focus.
          if (event.key === "Enter" || event.key === "Escape") saveNote();
        }}
      />

      {/*------ What Is Set ------*/}
      <div className="flex min-h-8 items-center justify-between gap-2">
        <output>
          <Marking variant="reading">{reminder ? whenLabel(reminder.remindAt) : m.reminder_only_you()}</Marking>
        </output>
        {reminder && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => clear.mutate({ projectId, taskId }, { onSuccess: onCleared })}
          >
            <XIcon data-icon="inline-start" />
            {m.reminder_clear()}
          </Button>
        )}
      </div>

      {reminder && <PushOffer />}
    </div>
  );
}

/*===== Drawer Field =====*/

/** The reminder in a card's drawer, which is the way in from the calendar: a key printing when, opening the panel. */
export function ReminderField({ projectId, taskId, code }: { projectId: string; taskId: string; code: string }) {
  const reminder = useReminders().find((item) => item.taskId === taskId);
  const [open, setOpen] = useState(false);

  return (
    <Field orientation="row">
      <FieldLabel htmlFor="task-reminder">{m.reminder_title()}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger id="task-reminder" render={<Button variant="secondary" size="sm" />}>
          {reminder ? <Led signal="action" state="on" size="sm" /> : <BellIcon data-icon="inline-start" />}
          {reminder ? whenLabel(reminder.remindAt) : m.reminder_open()}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <ReminderPanel projectId={projectId} taskId={taskId} code={code} onCleared={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
