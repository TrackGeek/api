import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { UploadService } from "@/shared/infra/upload/upload.service";
import { CreateProfileDto } from "../dto/create-profile.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";

@Injectable()
export class ProfileService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly uploadService: UploadService,
  ) {}
  
  async createProfile(createProfileDto: CreateProfileDto) {
    return this.databaseService.profile.create({
      data: {
        userId: createProfileDto.userId,
        avatarUrl: createProfileDto.avatarUrl,
      },
    });
  }

  async updateProfile(updateProfileDto: UpdateProfileDto) {
    await this.databaseService.profile.update({
      where: { userId: updateProfileDto.userId },
      data: {
        color: updateProfileDto.color,
        language: updateProfileDto.language,
        timezone: updateProfileDto.timezone,
        about: updateProfileDto.about,
      },
    });
  }

  async updateProfileAvatar(userId: string, file: Express.Multer.File): Promise<void> {
    const avatarUrl = await this.uploadService.uploadFromBuffer(file.buffer);

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

  async updateProfileBanner(userId: string, file: Express.Multer.File): Promise<void> {
    const bannerUrl = await this.uploadService.uploadFromBuffer(file.buffer);

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
