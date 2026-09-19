import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityService } from "@/modules/activity/service/activity.service";
import { ACTIVITY_CLEANUP_BATCH_SIZE } from "@/shared/constants/activity";
import { DatabaseService } from "@/shared/infra/database/database.service";

describe("ActivityService", () => {
  let databaseService: {
    $queryRaw: ReturnType<typeof vi.fn>;
    user: { findUnique: ReturnType<typeof vi.fn> };
    activity: { findMany: ReturnType<typeof vi.fn> };
    activityDayCount: { findMany: ReturnType<typeof vi.fn> };
  };
  let activityService: ActivityService;

  beforeEach(() => {
    databaseService = {
      $queryRaw: vi.fn(),
      user: { findUnique: vi.fn() },
      activity: { findMany: vi.fn() },
      activityDayCount: { findMany: vi.fn() },
    };
    activityService = new ActivityService(databaseService as unknown as DatabaseService);
  });

  describe("cleanupAutomatedActivities", () => {
    it("runs a single batch when fewer rows than the batch size are deleted", async () => {
      databaseService.$queryRaw.mockResolvedValueOnce([{ deleted: 12 }]);

      const deleted = await activityService.cleanupAutomatedActivities();

      expect(deleted).toBe(12);
      expect(databaseService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("keeps batching while a full batch is deleted", async () => {
      databaseService.$queryRaw
        .mockResolvedValueOnce([{ deleted: ACTIVITY_CLEANUP_BATCH_SIZE }])
        .mockResolvedValueOnce([{ deleted: ACTIVITY_CLEANUP_BATCH_SIZE }])
        .mockResolvedValueOnce([{ deleted: 3 }]);

      const deleted = await activityService.cleanupAutomatedActivities();

      expect(deleted).toBe(ACTIVITY_CLEANUP_BATCH_SIZE * 2 + 3);
      expect(databaseService.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it("cuts off thirty days before the given date", async () => {
      databaseService.$queryRaw.mockResolvedValueOnce([{ deleted: 0 }]);

      await activityService.cleanupAutomatedActivities(new Date("2026-09-19T00:00:00.000Z"));

      const values = databaseService.$queryRaw.mock.calls[0].slice(1) as unknown[];
      const cutoff = values.find((value) => value instanceof Date) as Date;

      expect(cutoff.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    });
  });

  describe("getUserActivityCalendarById", () => {
    beforeEach(() => {
      databaseService.user.findUnique.mockResolvedValue({ id: "user-1" });
    });

    it("merges archived day counts with live activities", async () => {
      databaseService.activity.findMany.mockResolvedValue([
        { createdAt: new Date("2026-09-18T10:00:00.000Z") },
        { createdAt: new Date("2026-09-18T22:00:00.000Z") },
      ]);
      databaseService.activityDayCount.findMany.mockResolvedValue([
        { date: new Date("2026-09-18T00:00:00.000Z"), count: 3 },
        { date: new Date("2026-03-02T00:00:00.000Z"), count: 7 },
      ]);

      const calendar = await activityService.getUserActivityCalendarById("user-1");

      expect(calendar.total).toBe(12);
      expect(calendar.items).toEqual([
        { date: "2026-03-02", count: 7 },
        { date: "2026-09-18", count: 5 },
      ]);
    });
  });
});
