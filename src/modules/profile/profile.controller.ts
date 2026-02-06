import { Controller, Delete, HttpCode, HttpStatus, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { FileInterceptor } from '@nestjs/platform-express';

import { ProfileService } from "./profile.service";
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';

@Controller("profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }
  
  @Post("avatar")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) =>
        file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
          ? cb(null, true)
          : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
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

  @Post("banner")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) =>
        file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
          ? cb(null, true)
          : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
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
