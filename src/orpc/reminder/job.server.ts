import { db } from "#/db/client.server";
import { createLogger } from "#/lib/logger.server";
import { teamHour, teamToday } from "#/lib/team-day";
import { DUE_REMINDER_HOUR } from "#/orpc/notification/constants";
import { remindEveryoneDue } from "#/orpc/notification/service";
import { fireReminders } from "#/orpc/reminder/service";

const log = createLogger("reminders");

/*===== Schedule =====*/
const RUN_INTERVAL_MS = 60 * 1000;

// Vite re-evaluates server modules on every change in development; the flag lives on `globalThis` so each edit doesn't
// start another timer.
const STARTED = Symbol.for("app.reminders.started");
const state = globalThis as typeof globalThis & { [STARTED]?: boolean };

let running = false;
/** The team day this process last checked due dates on, so it does so once a day; a failed pass isn't counted. */
let dueDatesCheckedOn: string | null = null;

/** One pass. Skipped while the previous one is still going. */
async function run(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = Date.now();
    const fired = await fireReminders({ db, now });
    if (fired > 0) log.info({ fired }, "fired reminders");

    const today = teamToday(now);
    if (dueDatesCheckedOn !== today && teamHour(now) >= DUE_REMINDER_HOUR) {
      await remindEveryoneDue({ db, now });
      dueDatesCheckedOn = today;
    }
  } catch (error) {
    log.error({ err: error }, "reminder run failed");
  } finally {
    running = false;
  }
}

/**
 * Fires reminders every minute and checks due dates each morning, inside the app's process (docs/backend/architecture.md
 * → Reminders), so both reach people with no Tofang page open. With two processes during a deploy, each reminder is
 * claimed once and the due-date index makes a repeat a no-op. The timer is `unref`ed and never keeps the process alive.
 */
export function startReminders(): void {
  if (state[STARTED]) return;
  state[STARTED] = true;

  setInterval(() => void run(), RUN_INTERVAL_MS).unref();
}
