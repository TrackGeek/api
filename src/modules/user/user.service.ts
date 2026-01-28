import { HttpService } from "@nestjs/axios";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { ImgBBService } from "@/infra/imgbb/imgbb.service";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { extractNameFromEmail, extractUsernameFromEmail } from "@/utils/email";
import { ERROR_CODES } from "@/config/errors.config";
import { UserUpdateDto } from "./dtos/user-update.dto";

@Injectable()
export class UserService {
	private readonly logger = new Logger(UserService.name);

	constructor(
		private readonly httpService: HttpService,
		private readonly prismaService: PrismaService,
		private readonly imgBBService: ImgBBService,
	) {}

	async createOrGetUser(
		email: string,
		name: string | null = null,
		avatarUrl: string | null = null,
	) {
		let user = await this.prismaService.user.findUnique({
			where: { email },
		});

		if (!user) {
			let username = extractUsernameFromEmail(email);

			const existingUser = await this.prismaService.user.findUnique({
				where: { username },
			});

			if (existingUser) {
				username += Math.floor(Math.random() * 10000).toString();
			}

			user = await this.prismaService.user.create({
				data: {
					email,
					name: name ?? extractNameFromEmail(email),
					username,
				},
			});
		}

		if (avatarUrl && !user.avatarUrl) {
			try {
				const response = await this.httpService.axiosRef.get(avatarUrl, {
					responseType: "arraybuffer",
				});

				await this.updateUserAvatar(user.id, {
					buffer: Buffer.from(response.data, "binary"),
				} as Express.Multer.File);
			} catch (error) {
				this.logger.error(
					`Failed to fetch or upload avatar for user ${user.id}: ${error.message}`,
				);
			}
		}

		return user;
	}

	async updateUser(userId: string, updateData: UserUpdateDto): Promise<void> {
		if (Object.keys(updateData).length === 0) {
			return;
		}

		if (!!updateData?.username) {
			const existingUser = await this.prismaService.user.findUnique({
				where: { username: updateData.username },
			});

			if (existingUser && existingUser.id !== userId) {
				throw new BadRequestException(ERROR_CODES.USERNAME_ALREADY_EXISTS);
			}
		}

		await this.prismaService.user.update({
			where: { id: userId },
			data: updateData,
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
		});

		if (!user) {
			throw new BadRequestException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}

	async getUserByUsername(username: string) {
		const user = await this.prismaService.user.findUnique({
			where: { username },
			omit: {
				email: true,
				language: true,
				discordId: true,
				githubId: true,
				googleId: true,
			},
		});

		if (!user) {
			throw new BadRequestException(ERROR_CODES.USER_NOT_FOUND);
		}

		return user;
	}

	async updateUserAvatar(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const avatarUrl = await this.imgBBService.upload(file.buffer);

		await this.prismaService.user.update({
			where: { id: userId },
			data: { avatarUrl },
		});
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		await this.prismaService.user.update({
			where: { id: userId },
			data: { avatarUrl: null },
		});
	}

	async updateUserBanner(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const bannerUrl = await this.imgBBService.upload(file.buffer);

		await this.prismaService.user.update({
			where: { id: userId },
			data: { bannerUrl },
		});
	}

	async deleteUserBanner(userId: string): Promise<void> {
		await this.prismaService.user.update({
			where: { id: userId },
			data: { bannerUrl: null },
		});
	}
}
