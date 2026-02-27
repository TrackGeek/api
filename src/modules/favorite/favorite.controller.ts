import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AddFavoriteDto } from "./dtos/add-favorite.dto";
import { GetFavoritesByUserIdDto } from "./dtos/get-favorites-by-user-id.dto";
import { RemoveFavoriteDto } from "./dtos/remove-favorite.dto";
import { FavoriteService } from "./favorite.service";

@Controller("favorite")
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@Session() session: UserSession, @Body() body: AddFavoriteDto) {
    await this.favoriteService.addFavorite({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete()
  @UseGuards(AuthGuard)
  async removeFavorite(@Session() session: UserSession, @Body() body: RemoveFavoriteDto) {
    await this.favoriteService.removeFavorite({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/user/:userId")
  async getFavoritesByUserId(
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Query() query: GetFavoritesByUserIdDto,
  ) {
    const favorites = await this.favoriteService.getFavoritesByUserId({
      ...query,
      userId,
    });

    return { favorites };
  }
}
