import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreenshotController } from "@/modules/game/controller/game-screenshot.controller";

const mockGetGameScreenshots = vi.fn();
const mockCreateGameScreenshot = vi.fn();
const mockUpdateGameScreenshot = vi.fn();
const mockDeleteGameScreenshot = vi.fn();

const mockService = {
  getGameScreenshots: mockGetGameScreenshots,
  createGameScreenshot: mockCreateGameScreenshot,
  updateGameScreenshot: mockUpdateGameScreenshot,
  deleteGameScreenshot: mockDeleteGameScreenshot,
};

const mockSession = { user: { id: "user-1" } };

describe("GameScreenshotController", () => {
  let controller: GameScreenshotController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new GameScreenshotController(mockService as any);
  });

  describe("getGameScreenshots", () => {
    it("should return screenshots wrapped in object", async () => {
      const paginationResult = {
        items: [{ id: "screenshot-1", url: "https://example.com/img.png" }],
        total: 1,
        count: 1,
        page: 1,
        itemsPerPage: 20,
        totalPages: 1,
      };

      mockGetGameScreenshots.mockResolvedValueOnce(paginationResult);

      const result = await controller.getGameScreenshots({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(result).toEqual({ screenshots: paginationResult });
      expect(mockGetGameScreenshots).toHaveBeenCalledWith({
        userId: "user-1",
        page: 1,
        itemsPerPage: 20,
      });
    });

    it("should pass optional filters to service", async () => {
      mockGetGameScreenshots.mockResolvedValueOnce({ items: [], total: 0, count: 0 });

      await controller.getGameScreenshots({
        userId: "user-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });

      expect(mockGetGameScreenshots).toHaveBeenCalledWith({
        userId: "user-1",
        gameId: "game-1",
        page: 1,
        itemsPerPage: 20,
      });
    });
  });

  describe("createGameScreenshot", () => {
    it("should call service with body merged with session userId", async () => {
      mockCreateGameScreenshot.mockResolvedValueOnce({ id: "screenshot-1" });

      await controller.createGameScreenshot(mockSession as any, {
        url: "https://example.com/img.png",
        isSpoiler: false,
        gameId: "game-1",
        userId: "",
      });

      expect(mockCreateGameScreenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com/img.png",
          isSpoiler: false,
          gameId: "game-1",
          userId: "user-1",
        }),
      );
    });

    it("should return the created screenshot", async () => {
      const screenshot = { id: "screenshot-1", url: "https://example.com/img.png" };
      mockCreateGameScreenshot.mockResolvedValueOnce(screenshot);

      const result = await controller.createGameScreenshot(mockSession as any, {
        url: "https://example.com/img.png",
        isSpoiler: true,
        gameId: "game-1",
        userId: "",
      });

      expect(result).toEqual({ screenshot });
    });
  });

  describe("updateGameScreenshot", () => {
    it("should call service with screenshotId and session userId", async () => {
      mockUpdateGameScreenshot.mockResolvedValueOnce({ id: "screenshot-1" });

      await controller.updateGameScreenshot("screenshot-1", mockSession as any, {
        description: "Nice shot",
        screenshotId: "",
        userId: "",
      });

      expect(mockUpdateGameScreenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Nice shot",
          screenshotId: "screenshot-1",
          userId: "user-1",
        }),
      );
    });

    it("should return the updated screenshot", async () => {
      const screenshot = { id: "screenshot-1", isSpoiler: true };
      mockUpdateGameScreenshot.mockResolvedValueOnce(screenshot);

      const result = await controller.updateGameScreenshot("screenshot-1", mockSession as any, {
        isSpoiler: true,
        screenshotId: "",
        userId: "",
      });

      expect(result).toEqual({ screenshot });
    });
  });

  describe("deleteGameScreenshot", () => {
    it("should call service with screenshotId and session userId", async () => {
      mockDeleteGameScreenshot.mockResolvedValueOnce(undefined);

      await controller.deleteGameScreenshot("screenshot-1", mockSession as any);

      expect(mockDeleteGameScreenshot).toHaveBeenCalledWith({
        screenshotId: "screenshot-1",
        userId: "user-1",
      });
    });

    it("should not return any body", async () => {
      mockDeleteGameScreenshot.mockResolvedValueOnce(undefined);

      const result = await controller.deleteGameScreenshot("screenshot-1", mockSession as any);

      expect(result).toBeUndefined();
    });
  });
});
