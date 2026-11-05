import { expect, it } from "vitest";

import { teamMoment, teamTime, teamToday } from "#/lib/team-day";

it("reads a picked date and time on the team's clock, not the computer's", () => {
  const moment = teamMoment({ date: "2026-11-07", time: "09:00" });

  expect(moment.toISOString()).toBe("2026-11-07T05:30:00.000Z");
  expect(teamTime(moment)).toBe("09:00");
  expect(teamToday(moment)).toBe("2026-11-07");
});
