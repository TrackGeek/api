import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { FavoriteService } from './favorite.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AddFavoriteDto } from './dtos/add-favorite.dto';
import { RemoveFavoriteDto } from './dtos/remove-favorite.dto';
import { GetFavoritesByUserIdDto } from './dtos/get-favorites-by-user-id.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("favorite")
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@Session() session: UserSession, @Body() body: AddFavoriteDto) {
    await this.favoriteService.addFavorite({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Delete()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async removeFavorite(@Session() session: UserSession, @Body() body: RemoveFavoriteDto) {
    await this.favoriteService.removeFavorite({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get('/user/:userId')
  @HttpCode(HttpStatus.OK)
  async getFavoritesByUserId(@Param('userId', new ParseUUIDPipe()) userId: string, @Query() query: GetFavoritesByUserIdDto) {
    const favorites = await this.favoriteService.getFavoritesByUserId({
      userId,
      itemsPerPage: query.itemsPerPage,
      page: query.page,
    });
    
    return { favorites }
  }
}
