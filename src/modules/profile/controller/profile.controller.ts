import { Body, Controller, Delete, Patch, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { imageConfig } from "@/shared/infra/upload/upload.config";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { ProfileService } from "../service/profile.service";

@ApiTags("Profile")
@Controller("/profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch("/")
  async updateProfile(@Session() session: UserSession, @Body() body: UpdateProfileDto) {
    await this.profileService.updateProfile({
      ...body,
      userId: session.user.id,
    });
  }

  @Patch("/avatar")
  @UseInterceptors(FileInterceptor("file", imageConfig))
  async updateProfileAvatar(@Session() session: UserSession, @UploadedFile() file: Express.Multer.File) {
    await this.profileService.updateProfileAvatar(session.user.id, file);
  }

  @Delete("/avatar")
  async deleteProfileAvatar(@Session() session: UserSession) {
    await this.profileService.deleteProfileAvatar(session.user.id);
  }

  @Patch("/banner")
  @UseInterceptors(FileInterceptor("file", imageConfig))
  async updateProfileBanner(@Session() session: UserSession, @UploadedFile() file: Express.Multer.File) {
    await this.profileService.updateProfileBanner(session.user.id, file);
  }

  @Delete("/banner")
  async deleteProfileBanner(@Session() session: UserSession) {
    await this.profileService.deleteProfileBanner(session.user.id);
  }
}
