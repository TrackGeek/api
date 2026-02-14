import { Injectable } from "@nestjs/common";

import { DatabaseService } from "@/shared/infra/database/database.service";
import { FeedEventDto } from "./dtos/feed-event.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { FeedEventFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class FeedEventService {
	constructor(private readonly databaseService: DatabaseService) {}

	async createFeedEvent(feedEventDto: FeedEventDto) {
		const { type, userId, metadata } = feedEventDto;

		await this.databaseService.feedEvent.create({
			data: {
				type,
				userId,
				metadata,
			},
		});
	}

	async getFeedEventsByUserId(userId: string) {
		const userExists = await this.databaseService.user.findUnique({
			where: { id: userId },
		});

		if (!userExists) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		const following = await this.databaseService.following.findMany({
			where: { followerId: userId },
			select: { followingId: true },
		});

		const friendIds = following.map((item) => item.followingId);
		
		const pagination = await this.databaseService.cursorPagination<FeedEventFindManyArgs>({
			model: "feedEvent",
			where: {
				userId: {
					in: [...friendIds, userId],
				},
			},
			include: {
				_count: {
					select: {
						feedEventReactions: true,
					}
				},
				feedEventReactions: {
					take: 3,
					select: {
						reaction: {
							select: {
								id: true,
								emoji: true,
								createdAt: true,
								user: {
									select: {
										username: true,
									}
								}
							}
						}
					}
				}
			},
			orderBy: { createdAt: "desc" },
		});

		return pagination;
	}

	async getFeedEvents() {
		const pagination = await this.databaseService.cursorPagination({
			model: "feedEvent",
			orderBy: { createdAt: "desc" },
		});

		return pagination;
	}
}
