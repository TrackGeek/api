import { describe, expect, it } from "vitest";
import { getNextReleaseCheckAt } from "@/modules/catchup/utils/release-check-schedule";

const now = new Date("2026-08-29T12:00:00Z");

describe("Release check scheduling", () => {
  it.each([
    { input: { active: true }, expected: "2026-08-30T00:00:00Z" },
    { input: { lastAirDate: "2026-08-25" }, expected: "2026-08-30T00:00:00Z" },
    { input: { lastAirDate: "2025-09-23" }, expected: "2026-09-05T00:00:00Z" },
    { input: { nextAirDate: "2026-10-11" }, expected: "2026-09-05T00:00:00Z" },
    { input: { nextAirDate: "2026-09-01" }, expected: "2026-09-01T00:00:00Z" },
    { input: { nextAirDate: "2026-08-29T20:00:00Z" }, expected: "2026-08-30T00:00:00Z" },
    { input: { nextAirDate: "2025-01-01" }, expected: "2026-09-05T00:00:00Z" },
    { input: { nextAirDate: "invalid" }, expected: "2026-09-05T00:00:00Z" },
  ])("schedules $input at $expected", ({ input, expected }) => {
    expect(getNextReleaseCheckAt({ now, timeZone: "UTC", ...input })).toEqual(new Date(expected));
  });

  it("schedules before the next local daily run across daylight saving changes", () => {
    const scheduled = getNextReleaseCheckAt({
      now: new Date("2026-10-24T12:00:00Z"),
      timeZone: "Europe/Lisbon",
      active: true,
    });
    expect(scheduled.getTime()).toBeGreaterThan(new Date("2026-10-24T12:00:00Z").getTime());
    expect(scheduled.getTime()).toBeLessThanOrEqual(new Date("2026-10-25T04:00:00Z").getTime());
  });
});
