import { Injectable } from "@nestjs/common";

import { ImgBBService } from "@/shared/infra/imgbb/imgbb.service";
import { PrismaService } from "@/shared/infra/prisma/prisma.service";
import {
	extractNameFromEmail,
	extractUsernameFromEmail,
} from "@/shared/utils/email";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { CreateUserDto } from "./dtos/create-user.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";

@Injectable()
export class UserService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly imgBBService: ImgBBService,
	) {}

	async createUser(createUserDto: CreateUserDto) {
		let user = await this.prismaService.user.findUnique({
			where: { email: createUserDto.email },
			include: {
				profile: true,
			}
		});

		if (!user) {
			let username = extractUsernameFromEmail(createUserDto.email);
			
			const existingUser = await this.prismaService.user.findUnique({
				where: { username },
			});

			if (existingUser) {
				username += Math.floor(Math.random() * 10000).toString();
			}

			user = await this.prismaService.user.create({
				data: {
					email: createUserDto.email,
					name: createUserDto.name ?? extractNameFromEmail(createUserDto.email),
					username,
					profile: {
						create: {}
					}
				},
				include: {
					profile: true,
				}
			});
		}

		if (createUserDto?.avatarUrl && !user.profile?.avatarUrl) {
			const avatarUrl = await this.imgBBService.uploadFromUrl(createUserDto?.avatarUrl);
			
			await this.prismaService.profile.update({
				where: { userId: user.id },
				data: { avatarUrl },
			});
		}
		
		if (createUserDto.googleId && !user.googleId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { googleId: createUserDto.googleId },
			});
		}

		if (createUserDto.discordId && !user.discordId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { discordId: createUserDto.discordId },
			});
		}

		if (createUserDto.githubId && !user.githubId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { githubId: createUserDto.githubId },
			});
		}

		return user;
	}

	async updateUser(userId: string, updateData: UpdateUserDto): Promise<void> {
		if (!!updateData?.username) {
			const existingUser = await this.prismaService.user.findUnique({
				where: { username: updateData.username },
			});

			if (existingUser && existingUser.id !== userId) {
				throw new AppException(ERROR_CODES.USERNAME_ALREADY_EXISTS);
			}
		}
		
		await this.prismaService.user.update({
			where: { id: userId },
			data: {
				name: updateData?.name,
				username: updateData?.username,
			},
		});
		
		await this.prismaService.profile.update({
			where: { userId },
			data: {
				language: updateData?.language,
				timezone: updateData?.timezone,
				about: updateData?.about,
				color: updateData?.color,
			}
		});
	}

	async getUserById(userId: string) {
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			omit: {
				discordId: true,
				githubId: true,
				googleId: true,
			},
			include: {
				profile: {
					omit: {
						userId: true,
					}
				},
			}
		});

		if (!user) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}

	async getUserByUsername(username: string) {
		const user = await this.prismaService.user.findUnique({
			where: { username },
			omit: {
				email: true,
				discordId: true,
				githubId: true,
				googleId: true,
			},
			include: {
				profile: {
					omit: {
						userId: true,
					}
				},
			}
		});

		if (!user) {
			throw new AppException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}

	async updateUserAvatar(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const avatarUrl = await this.imgBBService.uploadFromBuffer(file.buffer);

		await this.prismaService.profile.update({
			where: { userId },
			data: { avatarUrl },
		});
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		await this.prismaService.profile.update({
			where: { userId },
			data: { avatarUrl: null },
		});
	}

	async updateUserBanner(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const bannerUrl = await this.imgBBService.uploadFromBuffer(file.buffer);

		await this.prismaService.profile.update({
			where: { userId },
			data: { bannerUrl },
		});
	}

	async deleteUserBanner(userId: string): Promise<void> {
		await this.prismaService.profile.update({
			where: { userId },
			data: { bannerUrl: null },
		});
	}
}
