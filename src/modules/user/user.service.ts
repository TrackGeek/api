import { Injectable } from "@nestjs/common";

import { CreateUserDto } from './dto/create-user.dto';
import { DatabaseService } from '@/shared/infra/database/database.service';
import { UploadService } from '@/shared/infra/upload/upload.service';
import { extractNameFromEmail } from '@/shared/utils/email';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly uploadService: UploadService,
  ) {}
  
  async getUserById(id: string) {
    const user =  this.databaseService.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    
    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND)
    }
    
    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    let existingUser = await this.databaseService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      return;
    }

    const emailPrefix = createUserDto.email.split("@")[0];

    let baseUsername = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const usernameExists = await this.databaseService.user.findUnique({
      where: { username: baseUsername },
    });

    const username = usernameExists
      ? `${baseUsername}${Math.floor(Math.random() * 10000)}`
      : baseUsername;

    const avatarUrl = createUserDto.image
      ? await this.uploadService.uploadFromUrl(createUserDto.image)
      : undefined;

    await this.databaseService.user.create({
      data: {
        id: createUserDto.id,
        email: createUserDto.email,
        name:
          createUserDto.name && createUserDto.name?.length > 0
            ? createUserDto.name
            : extractNameFromEmail(createUserDto.email),
        username,
        emailVerified: createUserDto.emailVerified ?? false,
        profile: {
          create: {
            avatarUrl,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }
  
  async followUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppException(ERROR_CODES.USER_CANNOT_FOLLOW_SELF);
    }

    const existingFollow = await this.databaseService.following.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      throw new AppException(ERROR_CODES.USER_ALREADY_FOLLOWING);
    }

    await this.databaseService.following.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
    });
  }
  
  async unfollowUser(userId: string, targetUserId: string) {
    const existingFollow = await this.databaseService.following.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      throw new AppException(ERROR_CODES.USER_NOT_FOLLOWING);
    }

    await this.databaseService.following.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
  }
}
