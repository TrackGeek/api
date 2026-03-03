import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { TVShowProgressService } from "./tv-show-progress.service";
import { CreateOrUpdateTVShowProgressDto } from "./dtos/create-or-update-tv-show-progress.dto";
import { GetTVShowProgressDto } from './dtos/get-tv-show-progress.dto';

@Controller("/tv/progress")
export class TVShowProgressController {
  constructor(private readonly tvShowProgressService: TVShowProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateTVShowProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateTVShowProgressDto) {
    await this.tvShowProgressService.createOrUpdateTVShowProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get("/")
  async getTVShowProgressesByUserId(@Query() query: GetTVShowProgressDto) {
    const tvShowProgresses = await this.tvShowProgressService.getTVShowProgress(query);

    return { tvShowProgresses };
  }
}
