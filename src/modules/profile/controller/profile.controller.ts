import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { imageConfig } from "@/shared/infra/upload/upload.config";
import { AddSetupPhotoDto } from "../dto/add-setup-photo.dto";
import { CreateProfileLinkDto } from "../dto/create-profile-link.dto";
import { CreateSetupItemDto } from "../dto/create-setup-item.dto";
import { CreateWatchLinkDto } from "../dto/create-watch-link.dto";
import { ReorderProfileLinksDto } from "../dto/reorder-profile-links.dto";
import { ReorderSetupItemsDto } from "../dto/reorder-setup-items.dto";
import { ReorderWatchLinksDto } from "../dto/reorder-watch-links.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { UpdateProfileLinkDto } from "../dto/update-profile-link.dto";
import { UpdateSetupItemDto } from "../dto/update-setup-item.dto";
import { UpdateWatchLinkDto } from "../dto/update-watch-link.dto";
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

  @Post("/setup/photo")
  @HttpCode(HttpStatus.CREATED)
  async addSetupPhoto(@Session() session: UserSession, @Body() body: AddSetupPhotoDto) {
    const photo = await this.profileService.addSetupPhoto({
      ...body,
      userId: session.user.id,
    });

    return { photo };
  }

  @Delete("/setup/photo/:photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetupPhoto(@Session() session: UserSession, @Param("photoId", new ParseUUIDPipe()) photoId: string) {
    await this.profileService.deleteSetupPhoto(session.user.id, photoId);
  }

  @Post("/setup/item")
  @HttpCode(HttpStatus.CREATED)
  async createSetupItem(@Session() session: UserSession, @Body() body: CreateSetupItemDto) {
    const item = await this.profileService.createSetupItem({
      ...body,
      userId: session.user.id,
    });

    return { item };
  }

  @Patch("/setup/items/order")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderSetupItems(@Session() session: UserSession, @Body() body: ReorderSetupItemsDto) {
    await this.profileService.reorderSetupItems({
      ...body,
      userId: session.user.id,
    });
  }

  @Patch("/setup/item/:itemId")
  async updateSetupItem(
    @Session() session: UserSession,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body() body: UpdateSetupItemDto,
  ) {
    const item = await this.profileService.updateSetupItem({
      ...body,
      itemId,
      userId: session.user.id,
    });

    return { item };
  }

  @Delete("/setup/item/:itemId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetupItem(@Session() session: UserSession, @Param("itemId", new ParseUUIDPipe()) itemId: string) {
    await this.profileService.deleteSetupItem(session.user.id, itemId);
  }

  @Post("/link")
  @HttpCode(HttpStatus.CREATED)
  async createProfileLink(@Session() session: UserSession, @Body() body: CreateProfileLinkDto) {
    const link = await this.profileService.createProfileLink({
      ...body,
      userId: session.user.id,
    });

    return { link };
  }

  @Patch("/links/order")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderProfileLinks(@Session() session: UserSession, @Body() body: ReorderProfileLinksDto) {
    await this.profileService.reorderProfileLinks({
      ...body,
      userId: session.user.id,
    });
  }

  @Patch("/link/:linkId")
  async updateProfileLink(
    @Session() session: UserSession,
    @Param("linkId", new ParseUUIDPipe()) linkId: string,
    @Body() body: UpdateProfileLinkDto,
  ) {
    const link = await this.profileService.updateProfileLink({
      ...body,
      linkId,
      userId: session.user.id,
    });

    return { link };
  }

  @Delete("/link/:linkId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfileLink(@Session() session: UserSession, @Param("linkId", new ParseUUIDPipe()) linkId: string) {
    await this.profileService.deleteProfileLink(session.user.id, linkId);
  }

  @Get("/watch-links")
  async getWatchLinks(@Session() session: UserSession) {
    const watchLinks = await this.profileService.getWatchLinks(session.user.id);

    return { watchLinks };
  }

  @Post("/watch-link")
  @HttpCode(HttpStatus.CREATED)
  async createWatchLink(@Session() session: UserSession, @Body() body: CreateWatchLinkDto) {
    const watchLink = await this.profileService.createWatchLink({
      ...body,
      userId: session.user.id,
    });

    return { watchLink };
  }

  @Patch("/watch-links/order")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderWatchLinks(@Session() session: UserSession, @Body() body: ReorderWatchLinksDto) {
    await this.profileService.reorderWatchLinks({
      ...body,
      userId: session.user.id,
    });
  }

  @Patch("/watch-link/:linkId")
  async updateWatchLink(
    @Session() session: UserSession,
    @Param("linkId", new ParseUUIDPipe()) linkId: string,
    @Body() body: UpdateWatchLinkDto,
  ) {
    const watchLink = await this.profileService.updateWatchLink({
      ...body,
      linkId,
      userId: session.user.id,
    });

    return { watchLink };
  }

  @Delete("/watch-link/:linkId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWatchLink(@Session() session: UserSession, @Param("linkId", new ParseUUIDPipe()) linkId: string) {
    await this.profileService.deleteWatchLink(session.user.id, linkId);
  }
}
