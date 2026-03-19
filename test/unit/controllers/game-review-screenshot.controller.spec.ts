import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameReviewScreenshotController } from "@/modules/game/controller/game-review-screenshot.controller";

const mockGetGameReviewScreenshots = vi.fn();
const mockCreateGameReviewScreenshot = vi.fn();
const mockDeleteGameReviewScreenshot = vi.fn();

const mockService = {
  getGameReviewScreenshots: mockGetGameReviewScreenshots,
  createGameReviewScreenshot: mockCreateGameReviewScreenshot,
  deleteGameReviewScreenshot: mockDeleteGameReviewScreenshot,
};

const mockSession = { user: { id: "user-1" } };

describe("GameReviewScreenshotController", () => {
  let controller: GameReviewScreenshotController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new GameReviewScreenshotController(mockService as any);
  });

  describe("getGameReviewScreenshots", () => {
    it("should return screenshots wrapped in object", async () => {
      const paginationResult = {
        items: [{ id: "screenshot-1", url: "https://example.com/img.png" }],
        total: 1,
        count: 1,
        page: 1,
        itemsPerPage: 20,
        totalPages: 1,
      };

      mockGetGameReviewScreenshots.mockResolvedValueOnce(paginationResult);

      const result = await controller.getGameReviewScreenshots({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(result).toEqual({ screenshots: paginationResult });
      expect(mockGetGameReviewScreenshots).toHaveBeenCalledWith({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });
    });

    it("should pass optional filters to service", async () => {
      mockGetGameReviewScreenshots.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await controller.getGameReviewScreenshots({
        userId: "user-1",
        gameReviewId: "review-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(mockGetGameReviewScreenshots).toHaveBeenCalledWith({
        userId: "user-1",
        gameReviewId: "review-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });
    });
  });

  describe("createGameReviewScreenshot", () => {
    it("should call service with body merged with session userId", async () => {
      mockCreateGameReviewScreenshot.mockResolvedValueOnce(undefined);

      await controller.createGameReviewScreenshot(mockSession as any, {
        url: "https://example.com/img.png",
        isSpoiler: false,
        gameReviewId: "review-1",
        userId: "",
      });

      expect(mockCreateGameReviewScreenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com/img.png",
          isSpoiler: false,
          gameReviewId: "review-1",
          userId: "user-1",
        }),
      );
    });

    it("should not return any body", async () => {
      mockCreateGameReviewScreenshot.mockResolvedValueOnce(undefined);

      const result = await controller.createGameReviewScreenshot(mockSession as any, {
        url: "https://example.com/img.png",
        isSpoiler: true,
        gameReviewId: "review-1",
        userId: "",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteGameReviewScreenshot", () => {
    it("should call service with screenshotId and session userId", async () => {
      mockDeleteGameReviewScreenshot.mockResolvedValueOnce(undefined);

      await controller.deleteGameReviewScreenshot("screenshot-1", mockSession as any);

      expect(mockDeleteGameReviewScreenshot).toHaveBeenCalledWith({
        screenshotId: "screenshot-1",
        userId: "user-1",
      });
    });

    it("should not return any body", async () => {
      mockDeleteGameReviewScreenshot.mockResolvedValueOnce(undefined);

      const result = await controller.deleteGameReviewScreenshot("screenshot-1", mockSession as any);

      expect(result).toBeUndefined();
    });
  });
});
