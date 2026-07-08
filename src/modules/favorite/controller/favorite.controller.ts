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
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AddFavoriteDto } from "../dto/add-favorite.dto";
import { GetFavoriteStatusDto } from "../dto/get-favorite-status.dto";
import { GetFavoritesByUserIdDto } from "../dto/get-favorites-by-user-id.dto";
import { RemoveFavoriteDto } from "../dto/remove-favorite.dto";
import { FavoriteService } from "../service/favorite.service";

@ApiTags("Favorite")
@Controller("/favorite")
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@Session() session: UserSession, @Body() body: AddFavoriteDto) {
    await this.favoriteService.addFavorite({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/")
  @UseGuards(AuthGuard)
  async removeFavorite(@Session() session: UserSession, @Body() body: RemoveFavoriteDto) {
    await this.favoriteService.removeFavorite({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/status")
  @UseGuards(AuthGuard)
  async getFavoriteStatus(@Session() session: UserSession, @Query() query: GetFavoriteStatusDto) {
    const favorited = await this.favoriteService.getFavoriteStatus({
      ...query,
      userId: session.user.id,
    });

    return { favorited };
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
