import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentService } from "@/modules/comment/service/comment.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

const mockCommentCreate = vi.fn();
const mockCommentFindUnique = vi.fn();
const mockToCommentNotificationJob = vi.fn();
const mockToXpJob = vi.fn();

const mockDatabaseService = {
  comment: {
    create: mockCommentCreate,
    findUnique: mockCommentFindUnique,
  },
};

const mockQueueService = {
  toCommentNotificationJob: mockToCommentNotificationJob,
  toXpJob: mockToXpJob,
};

describe("CommentService", () => {
  let service: CommentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentService(mockDatabaseService as any, mockQueueService as any);
    mockCommentCreate.mockResolvedValue({ id: "new-comment" });
  });

  describe("createComment", () => {
    it("should create a top-level comment without touching parentId", async () => {
      await service.createComment({
        type: "ANIME" as any,
        content: "hello",
        userId: "user-1",
        animeId: "anime-1",
      } as any);

      expect(mockCommentFindUnique).not.toHaveBeenCalled();
      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ content: "hello", userId: "user-1", animeId: "anime-1" }),
      });
      expect(mockToCommentNotificationJob).toHaveBeenCalledWith({ commentId: "new-comment" });
    });

    it("should keep parentId when replying to a top-level comment", async () => {
      mockCommentFindUnique.mockResolvedValueOnce({ id: "root-1" });

      await service.createComment({
        type: "ANIME" as any,
        content: "reply",
        userId: "user-1",
        parentId: "root-1",
      } as any);

      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentId: "root-1" }),
      });
    });

    it("should nest under the reply when replying to a reply", async () => {
      mockCommentFindUnique.mockResolvedValueOnce({ id: "reply-1" });

      await service.createComment({
        type: "ANIME" as any,
        content: "reply to reply",
        userId: "user-1",
        parentId: "reply-1",
      } as any);

      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentId: "reply-1" }),
      });
    });

    it("should throw COMMENT_NOT_FOUND when parent does not exist", async () => {
      mockCommentFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.createComment({
          type: "ANIME" as any,
          content: "reply",
          userId: "user-1",
          parentId: "missing",
        } as any),
      ).rejects.toBeInstanceOf(AppException);

      expect(mockCommentCreate).not.toHaveBeenCalled();
    });
  });
});
