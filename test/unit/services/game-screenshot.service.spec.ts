import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreenshotService } from "@/modules/game/service/game-screenshot.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

const mockOffsetPagination = vi.fn();
const mockGameFindUnique = vi.fn();
const mockGameScreenshotCreate = vi.fn();
const mockGameScreenshotFindUnique = vi.fn();
const mockGameScreenshotUpdate = vi.fn();
const mockGameScreenshotDelete = vi.fn();

const mockDatabaseService = {
  offsetPagination: mockOffsetPagination,
  game: {
    findUnique: mockGameFindUnique,
  },
  gameScreenshot: {
    create: mockGameScreenshotCreate,
    findUnique: mockGameScreenshotFindUnique,
    update: mockGameScreenshotUpdate,
    delete: mockGameScreenshotDelete,
  },
};

describe("GameScreenshotService", () => {
  let service: GameScreenshotService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GameScreenshotService(mockDatabaseService as any);
  });

  describe("getGameScreenshots", () => {
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

      const result = await service.getGameScreenshots({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(result).toEqual(paginationResult);
      expect(mockOffsetPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gameScreenshot",
          where: { userId: "user-1" },
        }),
      );
    });

    it("should filter by gameId only", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameScreenshots({
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({ gameId: "game-1" });
    });

    it("should combine userId and gameId filters", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameScreenshots({
        userId: "user-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.where).toEqual({ userId: "user-1", gameId: "game-1" });
    });

    it("should include the related game summary", async () => {
      mockOffsetPagination.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await service.getGameScreenshots({ userId: "user-1" });

      const call = mockOffsetPagination.mock.calls[0][0];
      expect(call.include.game.select).toEqual({
        id: true,
        igdbId: true,
        coverUrl: true,
        name: true,
      });
    });
  });

  describe("createGameScreenshot", () => {
    it("should create a screenshot owned by the user without requiring a review", async () => {
      mockGameFindUnique.mockResolvedValueOnce({ id: "game-1" });
      mockGameScreenshotCreate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.createGameScreenshot({
        url: "https://example.com/img.png",
        gameId: "game-1",
        userId: "user-1",
      });

      expect(mockGameScreenshotCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            url: "https://example.com/img.png",
            description: undefined,
            isSpoiler: false,
            userId: "user-1",
            gameId: "game-1",
          },
        }),
      );
    });

    it("should create a screenshot with description and isSpoiler true", async () => {
      mockGameFindUnique.mockResolvedValueOnce({ id: "game-1" });
      mockGameScreenshotCreate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.createGameScreenshot({
        url: "https://example.com/img.png",
        description: "My screenshot",
        isSpoiler: true,
        gameId: "game-1",
        userId: "user-1",
      });

      expect(mockGameScreenshotCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            url: "https://example.com/img.png",
            description: "My screenshot",
            isSpoiler: true,
            userId: "user-1",
            gameId: "game-1",
          },
        }),
      );
    });

    it("should throw GAME_NOT_FOUND when game does not exist", async () => {
      mockGameFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.createGameScreenshot({
          url: "https://example.com/img.png",
          gameId: "game-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.GAME_NOT_FOUND.status });

      expect(mockGameScreenshotCreate).not.toHaveBeenCalled();
    });
  });

  describe("updateGameScreenshot", () => {
    it("should update only the provided fields", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce({ id: "screenshot-1", userId: "user-1" });
      mockGameScreenshotUpdate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.updateGameScreenshot({
        screenshotId: "screenshot-1",
        userId: "user-1",
        isSpoiler: true,
      });

      expect(mockGameScreenshotUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "screenshot-1" },
          data: { isSpoiler: true },
        }),
      );
    });

    it("should clear the description when an empty string is sent", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce({ id: "screenshot-1", userId: "user-1" });
      mockGameScreenshotUpdate.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.updateGameScreenshot({
        screenshotId: "screenshot-1",
        userId: "user-1",
        description: "",
      });

      const call = mockGameScreenshotUpdate.mock.calls[0][0];
      expect(call.data).toEqual({ description: null });
    });

    it("should throw NOT_FOUND when screenshot belongs to another user", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce({ id: "screenshot-1", userId: "other-user" });

      await expect(
        service.updateGameScreenshot({
          screenshotId: "screenshot-1",
          userId: "user-1",
          isSpoiler: true,
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.NOT_FOUND.status });

      expect(mockGameScreenshotUpdate).not.toHaveBeenCalled();
    });
  });

  describe("deleteGameScreenshot", () => {
    it("should delete a screenshot when it belongs to the user", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce({ id: "screenshot-1", userId: "user-1" });
      mockGameScreenshotDelete.mockResolvedValueOnce({ id: "screenshot-1" });

      await service.deleteGameScreenshot({
        screenshotId: "screenshot-1",
        userId: "user-1",
      });

      expect(mockGameScreenshotDelete).toHaveBeenCalledWith({
        where: { id: "screenshot-1" },
      });
    });

    it("should throw NOT_FOUND when screenshot does not exist", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteGameScreenshot({
          screenshotId: "screenshot-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.NOT_FOUND.status });

      expect(mockGameScreenshotDelete).not.toHaveBeenCalled();
    });

    it("should throw NOT_FOUND when screenshot belongs to another user", async () => {
      mockGameScreenshotFindUnique.mockResolvedValueOnce({ id: "screenshot-1", userId: "other-user" });

      await expect(
        service.deleteGameScreenshot({
          screenshotId: "screenshot-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ status: ERROR_CODES.NOT_FOUND.status });

      expect(mockGameScreenshotDelete).not.toHaveBeenCalled();
    });
  });
});
