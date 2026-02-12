import { Injectable } from "@nestjs/common";

import { DatabaseService } from "@/shared/infra/database/database.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { FeedEventType } from "@prisma/generated/enums";
import { extractNameFromEmail } from '@/shared/utils/email';

@Injectable()
export class UserService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly queueService: QueueService,
	) {}

	async getUserById(id: string) {
		const user = this.databaseService.user.findUnique({
			where: { id },
			include: {
				profile: true
			},
			omit: {
				image: true,
			}
		});

		if (!user) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}
	
	getName(name: string, email: string) {
		return name && name?.length > 0
			? name
			: extractNameFromEmail(email)
	}
	
	async getUsername(email: string) {
		const emailPrefix = email.split("@")[0];

		let baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "");

		const usernameExists = await this.databaseService.user.findUnique({
			where: { username: baseUsername },
		});

		const username = usernameExists
			? `${baseUsername}${Math.floor(Math.random() * 10000)}`
			: baseUsername;
			
		return username
	}

	async followUser(userId: string, targetUserId: string) {
		if (userId === targetUserId) {
			throw new AppException(ERROR_CODES.USER_CANNOT_FOLLOW_SELF);
		}

		const existingFollow = await this.databaseService.following.findUnique({
			where: {
				followerId_followingId: {
					followerId: userId,
					followingId: targetUserId,
				},
			},
		});

		if (existingFollow) {
			throw new AppException(ERROR_CODES.USER_ALREADY_FOLLOWING);
		}

		const following = await this.databaseService.following.create({
			data: {
				followerId: userId,
				followingId: targetUserId,
			},
			include: {
				follower: {
					include: {
						profile: true,
					},
				},
				following: {
					include: {
						profile: true,
					},
				},
			},
		});

		await this.queueService.toFeedEventQueue({
			type: FeedEventType.NewFollower,
			userId,
			metadata: {
				follower: {
					id: following.follower.id,
					name: following.follower.name,
					username: following.follower.username,
					profile: {
						id: following.follower.profile?.id,
						avatarUrl: following.follower.profile?.avatarUrl,
					},
				},
				following: {
					id: following.following.id,
					name: following.following.name,
					username: following.following.username,
					profile: {
						id: following.following.profile?.id,
						avatarUrl: following.following.profile?.avatarUrl,
					},
				},
			},
		});
	}

	async unfollowUser(userId: string, targetUserId: string) {
		const existingFollow = await this.databaseService.following.findUnique({
			where: {
				followerId_followingId: {
					followerId: userId,
					followingId: targetUserId,
				},
			},
		});

		if (!existingFollow) {
			throw new AppException(ERROR_CODES.USER_NOT_FOLLOWING);
		}

		await this.databaseService.following.delete({
			where: {
				followerId_followingId: {
					followerId: userId,
					followingId: targetUserId,
				},
			},
		});
	}
}
