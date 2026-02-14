import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { FavoriteService } from './favorite.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AddFavoriteDto } from './dtos/add-favorite.dto';
import { RemoveFavoriteDto } from './dtos/remote-favorite.dto';
import { GetFavoritesByUserIdDto } from './dtos/get-favorites-by-user-id.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("favorite")
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}
  
  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async addFavorite(@Session() session: UserSession, @Body() body: AddFavoriteDto) {
    await this.favoriteService.addFavorite({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Delete()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async removeFavorite(@Session() session: UserSession, @Body() body: RemoveFavoriteDto) {
    await this.favoriteService.removeFavorite({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get('/user/:id')
  @HttpCode(HttpStatus.OK)
  async getFavoritesByUserId(@Param('id') id: string, @Query() query: GetFavoritesByUserIdDto) {
    const favorites = await this.favoriteService.getFavoritesByUserId({
      userId: id,
      itemsPerPage: query.itemsPerPage,
      page: query.page,
    });
    
    return { favorites }
  }
}
