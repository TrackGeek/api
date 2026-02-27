import { Body, Controller, Delete, Patch, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { UpdateProfileDto } from "./dtos/update-profile.dto";
import { ProfileService } from "./profile.service";

const imageOptions = {
  fileFilter: (_req, file, cb) =>
    file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
      ? cb(null, true)
      : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
};

@Controller("profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch()
  async updateProfile(@Session() session: UserSession, @Body() body: UpdateProfileDto) {
    await this.profileService.updateProfile({
      ...body,
      userId: session.user.id,
    });
  }

  @Patch("avatar")
  @UseInterceptors(FileInterceptor("file", imageOptions))
  async updateProfileAvatar(@Session() session: UserSession, @UploadedFile() file: Express.Multer.File) {
    await this.profileService.updateProfileAvatar(session.user.id, file);
  }

  @Delete("avatar")
  async deleteProfileAvatar(@Session() session: UserSession) {
    await this.profileService.deleteProfileAvatar(session.user.id);
  }

  @Patch("banner")
  @UseInterceptors(FileInterceptor("file", imageOptions))
  async updateProfileBanner(@Session() session: UserSession, @UploadedFile() file: Express.Multer.File) {
    await this.profileService.updateProfileBanner(session.user.id, file);
  }

  @Delete("banner")
  async deleteProfileBanner(@Session() session: UserSession) {
    await this.profileService.deleteProfileBanner(session.user.id);
  }
}
