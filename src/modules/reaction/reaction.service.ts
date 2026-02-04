import { Injectable } from "@nestjs/common";

import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateReactionDto } from "./dtos/create-reaction.dto";
import { AddReactionToCommentDto } from "./dtos/add-reaction-to-comment.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { CommentReactionFindManyArgs } from "@prisma/generated/models";

@Injectable()
export class ReactionService {
	constructor(private readonly databaseService: DatabaseService) {}

	async createReaction(createReactionDto: CreateReactionDto) {
		return this.databaseService.reaction.create({
			data: {
				emoji: createReactionDto.emoji,
				userId: createReactionDto.userId,
			},
		});
	}

	async addReactionToComment(addReactionToCommentDto: AddReactionToCommentDto) {
		const commentAlreadyExists = await this.databaseService.comment.findUnique({
			where: { id: addReactionToCommentDto.commentId },
		});

		if (!commentAlreadyExists) {
			throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
		}

		const reaction = await this.createReaction({
			emoji: addReactionToCommentDto.emoji,
			userId: addReactionToCommentDto.userId,
		});

		await this.databaseService.commentReaction.create({
			data: {
				commentId: addReactionToCommentDto.commentId,
				reactionId: reaction.id,
			},
		});
	}

	async getReactionsByCommentId(commentId: string) {
		const commentAlreadyExists = await this.databaseService.comment.findUnique({
			where: { id: commentId },
		});

		if (!commentAlreadyExists) {
			throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
		}

		const pagination =
			await this.databaseService.cursorPagination<CommentReactionFindManyArgs>({
				model: "commentReaction",
				where: { commentId },
				include: {
					reaction: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									profile: {
										select: {
											avatarUrl: true,
										},
									},
								},
							},
						},
					},
				},
			});

		return {
			...pagination,
			items: pagination.items.map(({ reaction }) => reaction),
		};
	}
}
