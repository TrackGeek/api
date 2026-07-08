import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameReviewScreenshotService } from "@/modules/game/service/game-review-screenshot.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

const mockOffsetPagination = vi.fn();
const mockGameReviewFindUnique = vi.fn();
const mockGameReviewScreenshotCreate = vi.fn();
const mockGameReviewScreenshotFindUnique = vi.fn();
const mockGameReviewScreenshotDelete = vi.fn();

const mockDatabaseService = {
  offsetPagination: mockOffsetPagination,
  gameReview: {
    findUnique: mockGameReviewFindUnique,
  },
  gameReviewScreenshot: {
    create: mockGameReviewScreenshotCreate,
    findUnique: mockGameReviewScreenshotFindUnique,
    delete: mockGameReviewScreenshotDelete,
  },
};

describe("GameReviewScreenshotService", () => {
  let service: GameReviewScreenshotService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GameReviewScreenshotService(mockDatabaseService as any);
  });

  describe("getGameReviewScreenshots", () => {
    it("should return paginated screenshots filtered by userId only", async () => {
      const paginationResult = {
        items: [{ id: "screenshot-1", url: "https://example.com/img.png" }],
        total: 1,
        count: 1,
        page: 1,
        itemsPerPage: 20,
        totalPages: 1,
      };

      mockOffsetPagination.mockResolvedValueOnce(paginationResult);

      const result = await service.getGameReviewScreenshots({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(result).toEqual(paginationResult);
      expect(mockOffsetPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gameReviewScreenshot",
          where: {
            gameReview: { userId: "user-1" },
          },
        }),
      );
    });

    it("should filter by gameReviewId only", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameReviewScreenshots({
        gameReviewId: "review-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({ gameReviewId: "review-1" });
    });

    it("should filter by gameId only", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameReviewScreenshots({
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({ gameReview: { gameId: "game-1" } });
    });

    it("should combine userId and gameId filters", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameReviewScreenshots({
        userId: "user-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({
        gameReview: { userId: "user-1", gameId: "game-1" },
      });
    });

    it("should combine all three filters", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameReviewScreenshots({
        userId: "user-1",
        gameReviewId: "review-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({
        gameReviewId: "review-1",
        gameReview: { userId: "user-1", gameId: "game-1" },
      });
    });

    it("should not include gameReview in where when neither userId nor gameId are provided", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameReviewScreenshots({
        gameReviewId: "review-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).not.toHaveProperty("gameReview");
    });
  });

  describe("createGameReviewScreenshot", () => {
    it("should create a screenshot when review belongs to user", async () => {
      mockGameReviewFindUnique.mockResolvedValueOnce({ id: "review-1", userId: "user-1" });
      mockGameReviewScreenshotCreate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.createGameReviewScreenshot({
        url: "https://example.com/img.png",
        isSpoiler: false,
        gameReviewId: "review-1",
        userId: "user-1",
      });

      expect(mockGameReviewScreenshotCreate).toHaveBeenCalledWith({
        data: {
          url: "https://example.com/img.png",
          description: undefined,
          isSpoiler: false,
          gameReviewId: "review-1",
        },
      });
    });

    it("should create a screenshot with description and isSpoiler true", async () => {
      mockGameReviewFindUnique.mockResolvedValueOnce({ id: "review-1", userId: "user-1" });
      mockGameReviewScreenshotCreate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.createGameReviewScreenshot({
        url: "https://example.com/img.png",
        description: "My screenshot",
        isSpoiler: true,
        gameReviewId: "review-1",
        userId: "user-1",
      });

      expect(mockGameReviewScreenshotCreate).toHaveBeenCalledWith({
        data: {
          url: "https://example.com/img.png",
          description: "My screenshot",
          isSpoiler: true,
          gameReviewId: "review-1",
        },
      });
    });

    it("should throw REVIEW_NOT_FOUND when review does not exist", async () => {
      mockGameReviewFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.createGameReviewScreenshot({
          url: "https://example.com/img.png",
          isSpoiler: false,
          gameReviewId: "review-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.REVIEW_NOT_FOUND.status });

      expect(mockGameReviewScreenshotCreate).not.toHaveBeenCalled();
    });

    it("should throw REVIEW_NOT_FOUND when review belongs to another user", async () => {
      mockGameReviewFindUnique.mockResolvedValueOnce({ id: "review-1", userId: "other-user" });

      await expect(
        service.createGameReviewScreenshot({
          url: "https://example.com/img.png",
          isSpoiler: false,
          gameReviewId: "review-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.REVIEW_NOT_FOUND.status });

      expect(mockGameReviewScreenshotCreate).not.toHaveBeenCalled();
    });
  });

  describe("deleteGameReviewScreenshot", () => {
    it("should delete a screenshot when it belongs to the user", async () => {
      mockGameReviewScreenshotFindUnique.mockResolvedValueOnce({
        id: "screenshot-1",
        gameReview: { userId: "user-1" },
      });
      mockGameReviewScreenshotDelete.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.deleteGameReviewScreenshot({
        screenshotId: "screenshot-1",
        userId: "user-1",
      });

      expect(mockGameReviewScreenshotDelete).toHaveBeenCalledWith({
        where: { id: "screenshot-1" },
      });
    });

    it("should throw NOT_FOUND when screenshot does not exist", async () => {
      mockGameReviewScreenshotFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteGameReviewScreenshot({
          screenshotId: "screenshot-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.NOT_FOUND.status });

      expect(mockGameReviewScreenshotDelete).not.toHaveBeenCalled();
    });

    it("should throw NOT_FOUND when screenshot belongs to another user", async () => {
      mockGameReviewScreenshotFindUnique.mockResolvedValueOnce({
        id: "screenshot-1",
        gameReview: { userId: "other-user" },
      });

      await expect(
        service.deleteGameReviewScreenshot({
          screenshotId: "screenshot-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.NOT_FOUND.status });

      expect(mockGameReviewScreenshotDelete).not.toHaveBeenCalled();
    });
  });
});
