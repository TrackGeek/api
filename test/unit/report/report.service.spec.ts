import { faker } from "@faker-js/faker";
import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportService } from "@/modules/report/service/report.service";

const mockUserFindUnique = vi.fn();
const mockMessageFindUnique = vi.fn();
const mockCommentFindUnique = vi.fn();
const mockReportFindFirst = vi.fn();
const mockReportFindUnique = vi.fn();
const mockReportCreate = vi.fn();
const mockReportUpdate = vi.fn();

const mockDatabaseService = {
  user: { findUnique: mockUserFindUnique },
  message: { findUnique: mockMessageFindUnique },
  comment: { findUnique: mockCommentFindUnique },
  report: {
    findFirst: mockReportFindFirst,
    findUnique: mockReportFindUnique,
    create: mockReportCreate,
    update: mockReportUpdate,
  },
};

const mockChatService = { deleteMessageAsAdmin: vi.fn() };
const mockCommentService = { adminDeleteComment: vi.fn() };
const mockGateway = { emitToAdmins: vi.fn() };

describe("ReportService", () => {
  let service: ReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommentService.adminDeleteComment.mockResolvedValue(undefined);
    mockReportCreate.mockImplementation(async ({ data }) => ({ id: faker.string.uuid(), ...data, message: null }));
    service = new ReportService(
      mockDatabaseService as any,
      mockChatService as any,
      mockCommentService as any,
      mockGateway as any,
    );
  });

  it("creates a user report and notifies admins", async () => {
    const reporterId = faker.string.uuid();
    const targetId = faker.string.uuid();
    mockUserFindUnique.mockResolvedValue({ id: targetId });
    mockReportFindFirst.mockResolvedValue(null);

    await service.createReport(reporterId, {
      targetType: ReportTargetType.User,
      targetId,
      reason: ReportReason.Spam,
    });

    expect(mockReportCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reporterId, reportedUserId: targetId }) }),
    );
    expect(mockGateway.emitToAdmins).toHaveBeenCalledWith("admin:report:new", expect.any(Object));
  });

  it("cannot report self", async () => {
    const userId = faker.string.uuid();
    mockUserFindUnique.mockResolvedValue({ id: userId });

    await expect(
      service.createReport(userId, { targetType: ReportTargetType.User, targetId: userId, reason: ReportReason.Spam }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockReportCreate).not.toHaveBeenCalled();
  });

  it("cannot report own message or comment", async () => {
    const userId = faker.string.uuid();
    mockMessageFindUnique.mockResolvedValue({
      id: faker.string.uuid(),
      senderId: userId,
      conversation: { userAId: userId, userBId: faker.string.uuid() },
    });
    mockCommentFindUnique.mockResolvedValue({ id: faker.string.uuid(), userId, content: faker.lorem.sentence() });

    await expect(
      service.createReport(userId, {
        targetType: ReportTargetType.Message,
        targetId: faker.string.uuid(),
        reason: ReportReason.Spam,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.createReport(userId, {
        targetType: ReportTargetType.Comment,
        targetId: faker.string.uuid(),
        reason: ReportReason.Spam,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns not found when reported message sender was deleted", async () => {
    const reporterId = faker.string.uuid();
    mockMessageFindUnique.mockResolvedValue({
      id: faker.string.uuid(),
      senderId: null,
      conversation: { userAId: reporterId, userBId: null },
    });

    await expect(
      service.createReport(reporterId, {
        targetType: ReportTargetType.Message,
        targetId: faker.string.uuid(),
        reason: ReportReason.Spam,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("dedupes pending report for same reporter and target", async () => {
    const targetId = faker.string.uuid();
    mockUserFindUnique.mockResolvedValue({ id: targetId });
    mockReportFindFirst.mockResolvedValue({ id: faker.string.uuid() });

    await expect(
      service.createReport(faker.string.uuid(), {
        targetType: ReportTargetType.User,
        targetId,
        reason: ReportReason.Harassment,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockReportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: ReportStatus.Pending }) }),
    );
  });

  it("rejects reporting a message from a conversation the reporter is not in", async () => {
    mockMessageFindUnique.mockResolvedValue({
      id: faker.string.uuid(),
      senderId: faker.string.uuid(),
      conversation: { userAId: faker.string.uuid(), userBId: faker.string.uuid() },
    });

    await expect(
      service.createReport(faker.string.uuid(), {
        targetType: ReportTargetType.Message,
        targetId: faker.string.uuid(),
        reason: ReportReason.Spam,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("stores comment snapshot", async () => {
    const comment = { id: faker.string.uuid(), userId: faker.string.uuid(), content: faker.lorem.sentence() };
    mockCommentFindUnique.mockResolvedValue(comment);
    mockReportFindFirst.mockResolvedValue(null);

    await service.createReport(faker.string.uuid(), {
      targetType: ReportTargetType.Comment,
      targetId: comment.id,
      reason: ReportReason.Inappropriate,
    });

    expect(mockReportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ commentId: comment.id, contentSnapshot: comment.content }),
      }),
    );
  });

  describe("updateReport", () => {
    const adminId = faker.string.uuid();

    beforeEach(() => {
      mockReportUpdate.mockImplementation(async ({ data }) => ({ id: "r", ...data, message: null }));
    });

    it("soft deletes reported message when removeContent", async () => {
      const messageId = faker.string.uuid();
      mockReportFindUnique.mockResolvedValue({ id: "r", message: { id: messageId, deletedAt: null }, commentId: null });

      await service.updateReport(adminId, "r", { status: ReportStatus.Resolved, removeContent: true });

      expect(mockChatService.deleteMessageAsAdmin).toHaveBeenCalledWith(adminId, messageId);
      expect(mockReportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ReportStatus.Resolved, resolvedById: adminId }),
        }),
      );
    });

    it("skips already deleted message and deletes comment", async () => {
      const commentId = faker.string.uuid();
      mockReportFindUnique.mockResolvedValue({
        id: "r",
        message: { id: faker.string.uuid(), deletedAt: new Date() },
        commentId,
      });

      await service.updateReport(adminId, "r", { status: ReportStatus.Resolved, removeContent: true });

      expect(mockChatService.deleteMessageAsAdmin).not.toHaveBeenCalled();
      expect(mockCommentService.adminDeleteComment).toHaveBeenCalledWith(commentId);
    });

    it("dismisses without removing content", async () => {
      mockReportFindUnique.mockResolvedValue({ id: "r", message: null, commentId: faker.string.uuid() });

      await service.updateReport(adminId, "r", { status: ReportStatus.Dismissed });

      expect(mockCommentService.adminDeleteComment).not.toHaveBeenCalled();
    });

    it("throws when report missing", async () => {
      mockReportFindUnique.mockResolvedValue(null);

      await expect(service.updateReport(adminId, "r", { status: ReportStatus.Dismissed })).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
