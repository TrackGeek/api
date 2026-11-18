import { Injectable } from "@nestjs/common";
import { ReportStatus, ReportTargetType } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CHAT_EVENTS } from "../../chat/chat.constants";
import { serializeAdminMessage } from "../../chat/chat.serializer";
import { ChatGateway } from "../../chat/gateway/chat.gateway";
import { ChatService } from "../../chat/service/chat.service";
import { CommentService } from "../../comment/service/comment.service";
import type { CreateReportDto } from "../dto/create-report.dto";
import type { ListReportsDto } from "../dto/list-reports.dto";
import type { UpdateReportDto } from "../dto/update-report.dto";

const reportUserSelect = { id: true, name: true, username: true, profile: { select: { avatarUrl: true } } } as const;

const reportInclude = {
  reporter: { select: reportUserSelect },
  reportedUser: { select: reportUserSelect },
  message: true,
  comment: { select: { id: true, content: true, type: true, profileId: true, createdAt: true } },
} as const;

@Injectable()
export class ReportService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly chatService: ChatService,
    private readonly commentService: CommentService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createReport(reporterId: string, { targetType, targetId, reason, details }: CreateReportDto) {
    const target = await this.resolveTarget(reporterId, targetType, targetId);

    if (target.reportedUserId === reporterId) {
      throw new AppException(ERROR_CODES.CANNOT_REPORT_SELF);
    }

    const existing = await this.databaseService.report.findFirst({
      where: {
        reporterId,
        targetType,
        status: ReportStatus.Pending,
        reportedUserId: target.reportedUserId,
        messageId: target.messageId ?? null,
        commentId: target.commentId ?? null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppException(ERROR_CODES.REPORT_ALREADY_EXISTS);
    }

    const report = await this.databaseService.report.create({
      data: { reporterId, targetType, reason, details, ...target },
      include: reportInclude,
    });

    const payload = this.serializeReport(report);

    this.chatGateway.emitToAdmins(CHAT_EVENTS.adminReportNew, payload);

    return payload;
  }

  async listReports({ status, targetType, page, itemsPerPage }: ListReportsDto) {
    const result = await this.databaseService.offsetPagination({
      model: "report",
      page,
      itemsPerPage,
      where: { ...(status && { status }), ...(targetType && { targetType }) },
      orderBy: { createdAt: "desc" },
      include: reportInclude,
    });

    return { ...result, items: result.items.map((report: any) => this.serializeReport(report)) };
  }

  async updateReport(adminId: string, reportId: string, { status, resolutionNote, removeContent }: UpdateReportDto) {
    const report = await this.databaseService.report.findUnique({
      where: { id: reportId },
      include: { message: { select: { id: true, deletedAt: true } } },
    });

    if (!report) {
      throw new AppException(ERROR_CODES.REPORT_NOT_FOUND);
    }

    if (removeContent) {
      if (report.message && !report.message.deletedAt) {
        await this.chatService.deleteMessageAsAdmin(adminId, report.message.id);
      }

      if (report.commentId) {
        await this.commentService.adminDeleteComment(report.commentId).catch((error) => {
          if (!(error instanceof AppException) || error.getStatus() !== ERROR_CODES.COMMENT_NOT_FOUND.status) {
            throw error;
          }
        });
      }
    }

    const updated = await this.databaseService.report.update({
      where: { id: reportId },
      data: { status, resolutionNote, resolvedById: adminId, resolvedAt: new Date() },
      include: reportInclude,
    });

    return this.serializeReport(updated);
  }

  private async resolveTarget(reporterId: string, targetType: ReportTargetType, targetId: string) {
    if (targetType === ReportTargetType.User) {
      const user = await this.databaseService.user.findUnique({ where: { id: targetId }, select: { id: true } });

      if (!user) {
        throw new AppException(ERROR_CODES.USER_NOT_FOUND);
      }

      return { reportedUserId: user.id } as ReportTarget;
    }

    if (targetType === ReportTargetType.Message) {
      const message = await this.databaseService.message.findUnique({
        where: { id: targetId },
        include: { conversation: { select: { userAId: true, userBId: true } } },
      });

      const { userAId, userBId } = message?.conversation ?? {};

      if (!message?.senderId || (userAId !== reporterId && userBId !== reporterId)) {
        throw new AppException(ERROR_CODES.MESSAGE_NOT_FOUND);
      }

      return { reportedUserId: message.senderId, messageId: message.id } as ReportTarget;
    }

    const comment = await this.databaseService.comment.findUnique({
      where: { id: targetId },
      select: { id: true, userId: true, content: true },
    });

    if (!comment) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    return { reportedUserId: comment.userId, commentId: comment.id, contentSnapshot: comment.content } as ReportTarget;
  }

  private serializeReport<T extends { message?: any }>(report: T) {
    return { ...report, message: report.message ? serializeAdminMessage(report.message) : null };
  }
}

interface ReportTarget {
  reportedUserId: string;
  messageId?: string;
  commentId?: string;
  contentSnapshot?: string;
}
