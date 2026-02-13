import { Body, Controller, Delete, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { FileInterceptor } from '@nestjs/platform-express';

import { ProfileService } from "./profile.service";
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { UpdateProfileDto } from './dtos/update-profile.dto';

const imageOptions = {
  fileFilter: (_req, file, cb) =>
    file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
      ? cb(null, true)
      : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
}

@Controller("profile")
@UseGuards(RateLimitGuard)
@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }
  
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Session() session: UserSession,
    @Body() body: UpdateProfileDto
  ) {
    await this.profileService.updateProfile(session.user.id, body);
  }
  
  @Patch("avatar")
  @UseInterceptors(FileInterceptor("file", imageOptions))
  @HttpCode(HttpStatus.OK)
  async updateProfileAvatar(
    @Session() session: UserSession,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.profileService.updateProfileAvatar(session.user.id, file);
  }

  @Delete('avatar')
  async deleteProfileAvatar(@Session() session: UserSession) {
    await this.profileService.deleteProfileAvatar(session.user.id);
  }

  @Patch("banner")
  @UseInterceptors(FileInterceptor("file", imageOptions))
  @HttpCode(HttpStatus.OK)
  async updateProfileBanner(
    @Session() session: UserSession,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.profileService.updateProfileBanner(session.user.id, file);
  }

  @Delete('banner')
  async deleteProfileBanner(@Session() session: UserSession) {
    await this.profileService.deleteProfileBanner(session.user.id);
  }
}
