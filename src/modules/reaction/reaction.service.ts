import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/infra/prisma/prisma.service';
import { CreateReactionDto } from './dtos/create-reaction.dto';
import { AddReactionToCommentDto } from './dtos/add-reaction-to-comment.dto';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { CommentReactionFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class ReactionService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}
  
  async createReaction(createReactionDto: CreateReactionDto) {
    return this.prismaService.reaction.create({
      data: {
        emoji: createReactionDto.emoji,
        userId: createReactionDto.userId,
      },
    });
  }
  
  async addReactionToComment(addReactionToCommentDto: AddReactionToCommentDto) {
    const commentAlreadyExists = await this.prismaService.comment.findUnique({
      where: { id: addReactionToCommentDto.commentId },
    });
    
    if (!commentAlreadyExists) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }
    
    const reaction = await this.createReaction({
      emoji: addReactionToCommentDto.emoji,
      userId: addReactionToCommentDto.userId,
    });
    
    await this.prismaService.commentReaction.create({
      data: {
        commentId: addReactionToCommentDto.commentId,
        reactionId: reaction.id,
      },
    });
  }
  
  async getReactionsByCommentId(commentId: string) {
    const commentAlreadyExists = await this.prismaService.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!commentAlreadyExists) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }
    
    const pagination = await this.prismaService.cursorPagination<CommentReactionFindManyArgs>({
      model: 'commentReaction',
      where: { commentId },
      include: {
        reaction: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  }
                } 
              }
            }
          }
        }
      }
    })
    
    return {
      ...pagination,
      items: pagination.items.map(({ reaction }) => reaction),
    }
  }
}
