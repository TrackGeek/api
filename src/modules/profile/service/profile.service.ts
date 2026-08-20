import { Injectable } from "@nestjs/common";
import { CosmeticType, SetupItemType } from "@prisma/generated/enums";
import { CosmeticService } from "@/modules/cosmetic/service/cosmetic.service";
import { HEX_COLOR_REGEX } from "@/shared/constants/cosmetics";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { UploadService } from "@/shared/infra/upload/upload.service";
import { AddSetupPhotoDto } from "../dto/add-setup-photo.dto";
import { CreateProfileDto } from "../dto/create-profile.dto";
import { CreateSetupItemDto } from "../dto/create-setup-item.dto";
import { ReorderSetupItemsDto } from "../dto/reorder-setup-items.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { UpdateSetupItemDto } from "../dto/update-setup-item.dto";

const MAX_SETUP_PHOTOS = 10;
const MAX_SETUP_ITEMS = 30;

@Injectable()
export class ProfileService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly uploadService: UploadService,
    private readonly cosmeticService: CosmeticService,
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
    const color = HEX_COLOR_REGEX.test(updateProfileDto.color ?? "")
      ? updateProfileDto.color?.toLowerCase()
      : updateProfileDto.color;

    if (color) {
      await this.cosmeticService.assertProfileColorUnlocked(updateProfileDto.userId, color);
    }

    if (updateProfileDto.avatarFrame) {
      await this.cosmeticService.assertCosmeticUnlocked(
        updateProfileDto.userId,
        CosmeticType.AvatarFrame,
        updateProfileDto.avatarFrame,
      );
    }

    if (updateProfileDto.title) {
      await this.cosmeticService.assertCosmeticUnlocked(
        updateProfileDto.userId,
        CosmeticType.ProfileTitle,
        updateProfileDto.title,
      );
    }

    if (updateProfileDto.bannerEffect) {
      await this.cosmeticService.assertCosmeticUnlocked(
        updateProfileDto.userId,
        CosmeticType.BannerEffect,
        updateProfileDto.bannerEffect,
      );
    }

    await this.databaseService.profile.update({
      where: { userId: updateProfileDto.userId },
      data: {
        color,
        avatarFrame: updateProfileDto.avatarFrame,
        title: updateProfileDto.title,
        bannerEffect: updateProfileDto.bannerEffect,
        language: updateProfileDto.language,
        timezone: updateProfileDto.timezone,
        watchRegion: updateProfileDto.watchRegion,
        about: updateProfileDto.about,
        contentTypes: updateProfileDto.contentTypes,
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

  async addSetupPhoto(addSetupPhotoDto: AddSetupPhotoDto) {
    const profileId = await this.getProfileId(addSetupPhotoDto.userId);

    const photos = await this.databaseService.setupPhoto.count({ where: { profileId } });

    if (photos >= MAX_SETUP_PHOTOS) {
      throw new AppException(ERROR_CODES.SETUP_PHOTO_LIMIT_REACHED);
    }

    return this.databaseService.setupPhoto.create({
      data: {
        profileId,
        url: addSetupPhotoDto.url,
        position: photos,
      },
    });
  }

  async deleteSetupPhoto(userId: string, photoId: string): Promise<void> {
    const profileId = await this.getProfileId(userId);

    const photo = await this.databaseService.setupPhoto.findFirst({
      where: { id: photoId, profileId },
      select: { id: true },
    });

    if (!photo) {
      throw new AppException(ERROR_CODES.SETUP_PHOTO_NOT_FOUND);
    }

    await this.databaseService.setupPhoto.delete({ where: { id: photo.id } });
  }

  async createSetupItem(createSetupItemDto: CreateSetupItemDto) {
    const profileId = await this.getProfileId(createSetupItemDto.userId);

    const items = await this.databaseService.setupItem.count({ where: { profileId } });

    if (items >= MAX_SETUP_ITEMS) {
      throw new AppException(ERROR_CODES.SETUP_ITEM_LIMIT_REACHED);
    }

    const type = createSetupItemDto.type ?? SetupItemType.COMPONENT;
    const isComponent = type === SetupItemType.COMPONENT;

    return this.databaseService.setupItem.create({
      data: {
        profileId,
        type,
        name: type === SetupItemType.DIVIDER ? null : (createSetupItemDto.name ?? null),
        brand: isComponent ? createSetupItemDto.brand || null : null,
        link: isComponent ? createSetupItemDto.link || null : null,
        position: items,
      },
    });
  }

  async updateSetupItem(updateSetupItemDto: UpdateSetupItemDto) {
    const item = await this.findOwnedSetupItem(updateSetupItemDto.userId, updateSetupItemDto.itemId);

    const isComponent = item.type === SetupItemType.COMPONENT;

    return this.databaseService.setupItem.update({
      where: { id: item.id },
      data: {
        ...(item.type !== SetupItemType.DIVIDER &&
          updateSetupItemDto.name !== undefined && { name: updateSetupItemDto.name }),
        ...(isComponent && updateSetupItemDto.brand !== undefined && { brand: updateSetupItemDto.brand || null }),
        ...(isComponent && updateSetupItemDto.link !== undefined && { link: updateSetupItemDto.link || null }),
      },
    });
  }

  async reorderSetupItems(reorderSetupItemsDto: ReorderSetupItemsDto): Promise<void> {
    const profileId = await this.getProfileId(reorderSetupItemsDto.userId);

    const items = await this.databaseService.setupItem.findMany({
      where: { profileId },
      select: { id: true },
    });

    const ownedIds = new Set(items.map((item) => item.id));
    const isSameSet =
      reorderSetupItemsDto.itemIds.length === ownedIds.size &&
      reorderSetupItemsDto.itemIds.every((itemId) => ownedIds.has(itemId));

    if (!isSameSet) {
      throw new AppException(ERROR_CODES.SETUP_ITEM_NOT_FOUND);
    }

    await this.databaseService.$transaction(
      reorderSetupItemsDto.itemIds.map((itemId, position) =>
        this.databaseService.setupItem.update({
          where: { id: itemId },
          data: { position },
        }),
      ),
    );
  }

  async deleteSetupItem(userId: string, itemId: string): Promise<void> {
    const item = await this.findOwnedSetupItem(userId, itemId);

    await this.databaseService.setupItem.delete({ where: { id: item.id } });
  }

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.databaseService.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    return profile.id;
  }

  private async findOwnedSetupItem(userId: string, itemId: string) {
    const profileId = await this.getProfileId(userId);

    const item = await this.databaseService.setupItem.findFirst({
      where: { id: itemId, profileId },
      select: { id: true, type: true },
    });

    if (!item) {
      throw new AppException(ERROR_CODES.SETUP_ITEM_NOT_FOUND);
    }

    return item;
  }
}
