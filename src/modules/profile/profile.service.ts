import { Injectable } from "@nestjs/common";

import { UploadService } from "@/shared/infra/upload/upload.service";
import { DatabaseService } from "@/shared/infra/database/database.service";

@Injectable()
export class ProfileService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly imgBBService: UploadService,
	) {}

	async updateProfileAvatar(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const avatarUrl = await this.imgBBService.uploadFromBuffer(file.buffer);

		await this.databaseService.profile.update({
			where: { userId },
			data: { avatarUrl },
		});
	}

	async deleteProfileAvatar(userId: string): Promise<void> {
		await this.databaseService.profile.update({
			where: { userId },
			data: { avatarUrl: null },
		});
	}

	async updateProfileBanner(
		userId: string,
		file: Express.Multer.File,
	): Promise<void> {
		const bannerUrl = await this.imgBBService.uploadFromBuffer(file.buffer);

		await this.databaseService.profile.update({
			where: { userId },
			data: { bannerUrl },
		});
	}

	async deleteProfileBanner(userId: string): Promise<void> {
		await this.databaseService.profile.update({
			where: { userId },
			data: { bannerUrl: null },
		});
	}
}
