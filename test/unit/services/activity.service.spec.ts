import { ActivityType } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityService } from "@/modules/activity/service/activity.service";
import { ACTIVITY_CLEANUP_BATCH_SIZE } from "@/shared/constants/activity";
import { DatabaseService } from "@/shared/infra/database/database.service";

describe("ActivityService", () => {
  let databaseService: {
    $queryRaw: ReturnType<typeof vi.fn>;
    user: { findUnique: ReturnType<typeof vi.fn> };
    activity: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    offsetPagination: ReturnType<typeof vi.fn>;
    activityDayCount: { findMany: ReturnType<typeof vi.fn> };
  };
  let activityService: ActivityService;

  beforeEach(() => {
    databaseService = {
      $queryRaw: vi.fn(),
      user: { findUnique: vi.fn() },
      activity: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
      offsetPagination: vi.fn(),
      activityDayCount: { findMany: vi.fn() },
    };
    activityService = new ActivityService(databaseService as unknown as DatabaseService);
  });

  describe.each(["mangaProgressId", "bookProgressId"] as const)("chapter activities for %s", (progressField) => {
    const input = {
      type: ActivityType.ChaptersRead,
      userId: "user-1",
      [progressField]: "progress-1",
      metadata: { id: "progress-1", from: 2, to: 6, count: 5 },
    };

    it("creates a chapter range without deleting status activities", async () => {
      await activityService.createActivity(input);

      expect(databaseService.activity.create).toHaveBeenCalledWith({
        data: { ...input, metadata: { from: 2, to: 6, count: 5 } },
      });
      expect(databaseService.activity.deleteMany).not.toHaveBeenCalled();
      expect(databaseService.activity.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1", type: ActivityType.ChaptersRead, [progressField]: "progress-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("merges recent chapters while retaining the activity and its reactions", async () => {
      databaseService.activity.findFirst.mockResolvedValue({
        id: "activity-1",
        createdAt: new Date(),
        metadata: { from: 1, to: 2, count: 2 },
      });

      await activityService.createActivity(input);

      expect(databaseService.activity.update).toHaveBeenCalledWith({
        where: { id: "activity-1" },
        data: { metadata: { from: 1, to: 6, count: 6 } },
      });
      expect(databaseService.activity.create).not.toHaveBeenCalled();
    });

    it("does not double-count a repeated chapter range", async () => {
      databaseService.activity.findFirst.mockResolvedValue({
        id: "activity-1",
        createdAt: new Date(),
        metadata: { from: 2, to: 6, count: 5 },
      });

      await activityService.createActivity(input);

      expect(databaseService.activity.update).toHaveBeenCalledWith({
        where: { id: "activity-1" },
        data: { metadata: { from: 2, to: 6, count: 5 } },
      });
    });

    it("creates a separate event after the one-hour window", async () => {
      databaseService.activity.findFirst.mockResolvedValue({
        id: "activity-1",
        createdAt: new Date(Date.now() - 3_600_001),
        metadata: { from: 1, to: 1 },
      });

      await activityService.createActivity(input);

      expect(databaseService.activity.create).toHaveBeenCalled();
      expect(databaseService.activity.update).not.toHaveBeenCalled();
    });

    it("preserves chapter events when a progress status changes", async () => {
      await activityService.createActivity({ ...input, type: ActivityType.ProgressCompleted });

      expect(databaseService.activity.deleteMany).toHaveBeenCalledWith({
        where: { [progressField]: "progress-1", type: { not: ActivityType.ChaptersRead } },
      });
    });

    it("keeps chapter events for different progress records in separate feed groups", async () => {
      databaseService.offsetPagination.mockResolvedValue({
        items: [
          { ...input, id: "activity-1", createdAt: new Date() },
          { ...input, id: "activity-2", [progressField]: "progress-2", createdAt: new Date() },
        ],
      });

      const result = await activityService.getActivities({ page: 1, itemsPerPage: 20 });

      expect(result.items).toHaveLength(2);
    });
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
