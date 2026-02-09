import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";

import { CreateUserDto } from "./dto/create-user.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { UploadService } from "@/shared/infra/upload/upload.service";
import { extractNameFromEmail } from "@/shared/utils/email";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { UpdateUserDto } from './dto/update-user.dto';
import { QueueService } from '@/shared/infra/queue/queue.service';
import { FeedEventType } from '../feed-event/constants/feed-event-type';

@Injectable()
export class UserService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly uploadService: UploadService,
		private readonly queueService: QueueService,
	) {}

	async getUserById(id: string) {
		const user = this.databaseService.user.findUnique({
			where: { id },
			include: { profile: true },
		});

		if (!user) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}

	async createUser(createUserDto: CreateUserDto) {
		let existingUser = await this.databaseService.user.findUnique({
			where: { email: createUserDto.email },
		});

		if (existingUser) {
			return;
		}

		const emailPrefix = createUserDto.email.split("@")[0];

		let baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "");
		
		const usernameExists = await this.databaseService.user.findUnique({
			where: { username: baseUsername },
		});

		const username = usernameExists
			? `${baseUsername}${Math.floor(Math.random() * 10000)}`
			: baseUsername;

		const avatarUrl = createUserDto.image
			? await this.uploadService.uploadFromUrl(createUserDto.image)
			: undefined;

		await this.databaseService.user.create({
			data: {
				id: crypto.randomUUID(),
				email: createUserDto.email,
				name:
					createUserDto.name && createUserDto.name?.length > 0
						? createUserDto.name
						: extractNameFromEmail(createUserDto.email),
				username,
				emailVerified: createUserDto.emailVerified ?? false,
				profile: {
					create: {
						avatarUrl,
					},
				},
			},
		});
	}
	
	async updateUser(updateUserDto: UpdateUserDto) {
		const { id, name, image } = updateUserDto;

		const user = await this.databaseService.user.findUnique({
			where: { id },
			include: { profile: true },
		});

		if (!user) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		let avatarUrl = user.profile?.avatarUrl;

		if (image) {
			avatarUrl = await this.uploadService.uploadFromUrl(image);
		}

		await this.databaseService.user.update({
			where: { id },
			data: {
				name,
				profile: {
					update: {
						avatarUrl,
					},
				},
			},
		});
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
					}
				},
				following: {
					include: {
						profile: true,
					}
				},
			}
		});
		
		await this.queueService.addFeedEventQueue({
			type: FeedEventType.newFollower,
			userId,
			metadata: {
				follower: {
					id: following.follower.id,
					name: following.follower.name,
					username: following.follower.username,
					profile: {
						id: following.follower.profile?.id,
						avatarUrl: following.follower.profile?.avatarUrl,
					}
				},
				following: {
					id: following.following.id,
					name: following.following.name,
					username: following.following.username,
					profile: {
						id: following.following.profile?.id,
						avatarUrl: following.following.profile?.avatarUrl,
					}
				},
			},
		})
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
