import { Injectable } from "@nestjs/common";

import { DatabaseService } from "@/shared/infra/database/database.service";
import { AddCommentToProfileDto } from "./dtos/add-comment-to-profile.dto";
import { CreateCommentDto } from "./dtos/create-comment.dto";
import { AddCommentToGameDto } from "./dtos/add-comment-to-game.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import {
	GameCommentFindManyArgs,
	ProfileCommentFindManyArgs,
} from "@prisma/generated/models";

@Injectable()
export class CommentService {
	constructor(private readonly databaseService: DatabaseService) {}

	async createComment(createCommentDto: CreateCommentDto) {
		const userAlreadyExists = await this.databaseService.user.findUnique({
			where: { id: createCommentDto.userId },
		});

		if (!userAlreadyExists) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		return this.databaseService.comment.create({
			data: {
				content: createCommentDto.content,
				userId: createCommentDto.userId,
			},
		});
	}

	async addCommentToProfile(addCommentToProfileDto: AddCommentToProfileDto) {
		const profileAlreadyExists = await this.databaseService.profile.findUnique({
			where: { id: addCommentToProfileDto.profileId },
		});

		if (!profileAlreadyExists) {
			throw new AppException(ERROR_CODES.PROFILE_NOT_FOUND);
		}

		const comment = await this.createComment({
			content: addCommentToProfileDto.content,
			userId: addCommentToProfileDto.userId,
		});

		await this.databaseService.profileComment.create({
			data: {
				profileId: addCommentToProfileDto.profileId,
				commentId: comment.id,
			},
		});
	}

	async addCommentToGame(addCommentToGameDto: AddCommentToGameDto) {
		const gameAlreadyExists = await this.databaseService.game.findUnique({
			where: { id: addCommentToGameDto.gameId },
		});

		if (!gameAlreadyExists) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		const comment = await this.createComment({
			content: addCommentToGameDto.content,
			userId: addCommentToGameDto.userId,
		});

		await this.databaseService.gameComment.create({
			data: {
				gameId: addCommentToGameDto.gameId,
				commentId: comment.id,
			},
		});
	}

	async deleteComment(commentId: string) {
		const commentAlreadyExists = await this.databaseService.comment.findUnique({
			where: { id: commentId },
		});

		if (!commentAlreadyExists) {
			throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
		}

		await this.databaseService.comment.delete({
			where: { id: commentId },
		});
	}

	async getCommentsByProfileId(profileId: string) {
		const profileAlreadyExists = await this.databaseService.profile.findUnique({
			where: { id: profileId },
		});

		if (!profileAlreadyExists) {
			throw new AppException(ERROR_CODES.PROFILE_NOT_FOUND);
		}

		const pagination =
			await this.databaseService.cursorPagination<ProfileCommentFindManyArgs>({
				model: "profileComment",
				where: { profileId },
				include: {
					comment: {
						omit: {
							userId: true,
						},
						include: {
							_count: {
								select: {
									commentsReactions: true,
								},
							},
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
			items: pagination.items.map(({ comment }) => comment),
		};
	}

	async getCommentsByGameId(gameId: string) {
		const gameAlreadyExists = await this.databaseService.game.findUnique({
			where: { id: gameId },
		});

		if (!gameAlreadyExists) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		const pagination =
			await this.databaseService.cursorPagination<GameCommentFindManyArgs>({
				model: "gameComment",
				where: { gameId },
				include: {
					comment: {
						omit: {
							userId: true,
						},
						include: {
							_count: {
								select: {
									commentsReactions: true,
								},
							},
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
			items: pagination.items.map(({ comment }) => comment),
		};
	}
}
