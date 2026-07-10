import { Injectable } from "@nestjs/common";
import { CommentFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { DeleteCommentDto } from "../dto/delete-comment.dto";
import { GetCommentsDto } from "../dto/get-comments.dto";

const MAX_REPLY_DEPTH = 20;

@Injectable()
export class CommentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createComment(createCommentDto: CreateCommentDto) {
    const { type, content, userId, ...entityIds } = createCommentDto;

    if (entityIds.parentId) {
      const parent = await this.databaseService.comment.findUnique({
        where: { id: entityIds.parentId },
        select: { id: true },
      });

      if (!parent) {
        throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
      }
    }

    const comment = await this.databaseService.comment.create({
      data: {
        type,
        content,
        userId,
        ...entityIds,
      },
    });

    await this.queueService.toCommentNotificationJob({ commentId: comment.id });
  }

  async deleteComment(deleteCommentDto: DeleteCommentDto) {
    const comment = await this.databaseService.comment.findUnique({
      where: { id: deleteCommentDto.commentId },
      include: { profile: { select: { userId: true } } },
    });

    if (!comment) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    const isAuthor = comment.userId === deleteCommentDto.userId;
    const isProfileOwner = comment.profile?.userId === deleteCommentDto.userId;

    if (!isAuthor && !isProfileOwner) {
      throw new AppException(ERROR_CODES.UNAUTHORIZED);
    }

    await this.databaseService.comment.delete({
      where: { id: comment.id },
    });
  }

  async getComments({ page, itemsPerPage, ...getCommentsDto }: GetCommentsDto) {
    const userSelect = {
      id: true,
      name: true,
      username: true,
      profile: {
        select: {
          id: true,
          avatarUrl: true,
        },
      },
    } as const;

    const reactionsInclude = {
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        emoji: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    } as const;

    const pagination = await this.databaseService.offsetPagination<CommentFindManyArgs>({
      model: "comment",
      where: { ...getCommentsDto, parentId: null },
      page,
      itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: userSelect,
        },
        anime: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            name: true,
            posterUrl: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            posterUrl: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            name: true,
            coverUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            title: true,
            imageUrl: true,
          },
        },
        reactions: reactionsInclude,
      },
    });

    const rootComments = pagination.items as Array<{ id: string; replies?: unknown[] }>;

    if (rootComments.length > 0) {
      // Fetch the full reply subtree level by level (Prisma can't include to
      // arbitrary depth) and rebuild the nested tree in memory.
      const descendants: Array<{ id: string; parentId: string | null }> = [];
      let frontier = rootComments.map((comment) => comment.id);
      let depth = 0;

      while (frontier.length > 0 && depth < MAX_REPLY_DEPTH) {
        const children = (await this.databaseService.comment.findMany({
          where: { parentId: { in: frontier } },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: userSelect },
            reactions: reactionsInclude,
          },
        })) as Array<{ id: string; parentId: string | null }>;

        if (children.length === 0) break;

        descendants.push(...children);
        frontier = children.map((child) => child.id);
        depth += 1;
      }

      const childrenByParent = new Map<string, Array<{ id: string; parentId: string | null; replies?: unknown[] }>>();

      for (const child of descendants) {
        const siblings = childrenByParent.get(child.parentId as string) ?? [];
        siblings.push(child);
        childrenByParent.set(child.parentId as string, siblings);
      }

      const attachReplies = (comment: { id: string; replies?: unknown[] }) => {
        const replies = childrenByParent.get(comment.id) ?? [];
        comment.replies = replies;
        for (const reply of replies) attachReplies(reply);
      };

      for (const root of rootComments) attachReplies(root);
    }

    return pagination;
  }
}
