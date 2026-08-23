import { Injectable } from "@nestjs/common";
import { CosmeticType, SetupItemType } from "@prisma/generated/enums";
import { CosmeticService } from "@/modules/cosmetic/service/cosmetic.service";
import { HEX_COLOR_REGEX } from "@/shared/constants/cosmetics";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { MAX_WATCH_LINKS } from "@/shared/constants/watch-link";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { UploadService } from "@/shared/infra/upload/upload.service";
import { AddSetupPhotoDto } from "../dto/add-setup-photo.dto";
import { CreateProfileDto } from "../dto/create-profile.dto";
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

const MAX_SETUP_PHOTOS = 10;
const MAX_SETUP_ITEMS = 30;
const MAX_PROFILE_LINKS = 10;

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

  async createProfileLink(createProfileLinkDto: CreateProfileLinkDto) {
    const profileId = await this.getProfileId(createProfileLinkDto.userId);

    const links = await this.databaseService.profileLink.count({ where: { profileId } });

    if (links >= MAX_PROFILE_LINKS) {
      throw new AppException(ERROR_CODES.PROFILE_LINK_LIMIT_REACHED);
    }

    return this.databaseService.profileLink.create({
      data: {
        profileId,
        label: createProfileLinkDto.label,
        url: createProfileLinkDto.url,
        position: links,
      },
    });
  }

  async updateProfileLink(updateProfileLinkDto: UpdateProfileLinkDto) {
    const link = await this.findOwnedProfileLink(updateProfileLinkDto.userId, updateProfileLinkDto.linkId);

    return this.databaseService.profileLink.update({
      where: { id: link.id },
      data: {
        ...(updateProfileLinkDto.label !== undefined && { label: updateProfileLinkDto.label }),
        ...(updateProfileLinkDto.url !== undefined && { url: updateProfileLinkDto.url }),
      },
    });
  }

  async reorderProfileLinks(reorderProfileLinksDto: ReorderProfileLinksDto): Promise<void> {
    const profileId = await this.getProfileId(reorderProfileLinksDto.userId);

    const links = await this.databaseService.profileLink.findMany({
      where: { profileId },
      select: { id: true },
    });

    const ownedIds = new Set(links.map((link) => link.id));
    const isSameSet =
      reorderProfileLinksDto.linkIds.length === ownedIds.size &&
      reorderProfileLinksDto.linkIds.every((linkId) => ownedIds.has(linkId));

    if (!isSameSet) {
      throw new AppException(ERROR_CODES.PROFILE_LINK_NOT_FOUND);
    }

    await this.databaseService.$transaction(
      reorderProfileLinksDto.linkIds.map((linkId, position) =>
        this.databaseService.profileLink.update({
          where: { id: linkId },
          data: { position },
        }),
      ),
    );
  }

  async deleteProfileLink(userId: string, linkId: string): Promise<void> {
    const link = await this.findOwnedProfileLink(userId, linkId);

    await this.databaseService.profileLink.delete({ where: { id: link.id } });
  }

  async getWatchLinks(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.databaseService.watchLink.findMany({
      where: { profileId },
      orderBy: { position: "asc" },
    });
  }

  async createWatchLink(createWatchLinkDto: CreateWatchLinkDto) {
    const profileId = await this.getProfileId(createWatchLinkDto.userId);

    const links = await this.databaseService.watchLink.count({ where: { profileId } });

    if (links >= MAX_WATCH_LINKS) {
      throw new AppException(ERROR_CODES.WATCH_LINK_LIMIT_REACHED);
    }

    return this.databaseService.watchLink.create({
      data: {
        profileId,
        label: createWatchLinkDto.label,
        url: createWatchLinkDto.url,
        contentTypes: createWatchLinkDto.contentTypes,
        enabled: createWatchLinkDto.enabled ?? true,
        position: links,
      },
    });
  }

  async updateWatchLink(updateWatchLinkDto: UpdateWatchLinkDto) {
    const link = await this.findOwnedWatchLink(updateWatchLinkDto.userId, updateWatchLinkDto.linkId);

    return this.databaseService.watchLink.update({
      where: { id: link.id },
      data: {
        ...(updateWatchLinkDto.label !== undefined && { label: updateWatchLinkDto.label }),
        ...(updateWatchLinkDto.url !== undefined && { url: updateWatchLinkDto.url }),
        ...(updateWatchLinkDto.contentTypes !== undefined && { contentTypes: updateWatchLinkDto.contentTypes }),
        ...(updateWatchLinkDto.enabled !== undefined && { enabled: updateWatchLinkDto.enabled }),
      },
    });
  }

  async reorderWatchLinks(reorderWatchLinksDto: ReorderWatchLinksDto): Promise<void> {
    const profileId = await this.getProfileId(reorderWatchLinksDto.userId);

    const links = await this.databaseService.watchLink.findMany({
      where: { profileId },
      select: { id: true },
    });

    const ownedIds = new Set(links.map((link) => link.id));
    const isSameSet =
      reorderWatchLinksDto.linkIds.length === ownedIds.size &&
      reorderWatchLinksDto.linkIds.every((linkId) => ownedIds.has(linkId));

    if (!isSameSet) {
      throw new AppException(ERROR_CODES.WATCH_LINK_NOT_FOUND);
    }

    await this.databaseService.$transaction(
      reorderWatchLinksDto.linkIds.map((linkId, position) =>
        this.databaseService.watchLink.update({
          where: { id: linkId },
          data: { position },
        }),
      ),
    );
  }

  async deleteWatchLink(userId: string, linkId: string): Promise<void> {
    const link = await this.findOwnedWatchLink(userId, linkId);

    await this.databaseService.watchLink.delete({ where: { id: link.id } });
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

  private async findOwnedProfileLink(userId: string, linkId: string) {
    const profileId = await this.getProfileId(userId);

    const link = await this.databaseService.profileLink.findFirst({
      where: { id: linkId, profileId },
      select: { id: true },
    });

    if (!link) {
      throw new AppException(ERROR_CODES.PROFILE_LINK_NOT_FOUND);
    }

    return link;
  }

  private async findOwnedWatchLink(userId: string, linkId: string) {
    const profileId = await this.getProfileId(userId);

    const link = await this.databaseService.watchLink.findFirst({
      where: { id: linkId, profileId },
      select: { id: true },
    });

    if (!link) {
      throw new AppException(ERROR_CODES.WATCH_LINK_NOT_FOUND);
    }

    return link;
  }
}
