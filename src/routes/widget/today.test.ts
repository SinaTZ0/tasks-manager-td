import { describe, expect, it } from "vitest";

import { teamToday } from "#/lib/team-day";
import type { Notification } from "#/orpc/notification/contract";
import type { MyTask } from "#/orpc/task/contract";

import { isToday, withoutRepeats } from "./today";

const task = (fields: Partial<MyTask>) => ({ id: "t1", columnKind: "todo", dueDate: null, ...fields }) as MyTask;

const item = (fields: Partial<Notification>) => ({ id: "n", taskId: "t1", kind: "overdue", ...fields }) as Notification;

describe("isToday", () => {
  const today = "2026-11-06";

  it("takes work under way, and what is due today or late, but not tomorrow", () => {
    expect(isToday({ task: task({ columnKind: "doing" }), today })).toBe(true);
    expect(isToday({ task: task({ dueDate: "2026-11-06" }), today })).toBe(true);
    expect(isToday({ task: task({ dueDate: "2026-11-05" }), today })).toBe(true);
    expect(isToday({ task: task({ dueDate: "2026-11-07" }), today })).toBe(false);
    expect(isToday({ task: task({}), today })).toBe(false);
  });

  it("turns over at the team's midnight, not the machine's", () => {
    // 20:29 UTC is 23:59 in Tehran, 20:31 is the next day: a task due on the 6th goes from today to late, and one due
    // on the 7th comes into today.
    const before = teamToday(new Date("2026-11-06T20:29:00Z"));
    const after = teamToday(new Date("2026-11-06T20:31:00Z"));
    const nextDay = task({ dueDate: "2026-11-07" });
    expect(isToday({ task: nextDay, today: before })).toBe(false);
    expect(isToday({ task: nextDay, today: after })).toBe(true);
  });
});

describe("withoutRepeats", () => {
  it("drops a due-date alert only for a task already listed", () => {
    const items = [
      item({ id: "listed" }),
      item({ id: "other", taskId: "t2" }),
      item({ id: "said", kind: "mentioned" }),
    ];
    expect(withoutRepeats({ items, today: [task({})] }).map((kept) => kept.id)).toEqual(["other", "said"]);
  });
});
