import { Body, Controller, Get, HttpCode, Post, Query, Req, UseFilters, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IntegrationExceptionFilter } from "../filters/integration-exception.filter";
import { IntegrationAction, IntegrationGuard } from "../guards/integration.guard";
import { IntegrationOperationsService } from "../service/integration-operations.service";
import type { IntegrationRequest } from "../types/integration-request";

@ApiTags("Integrations")
@Controller("/integrations/v1")
@UseGuards(IntegrationGuard)
@UseFilters(IntegrationExceptionFilter)
export class IntegrationController {
  constructor(private readonly operations: IntegrationOperationsService) {}

  @Get("/media/search")
  @IntegrationAction("search_media")
  search(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("search_media", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/media/details")
  @IntegrationAction("get_media_details")
  details(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("get_media_details", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/media/episodes")
  @IntegrationAction("get_episodes")
  episodes(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("get_episodes", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/me")
  @IntegrationAction("get_my_profile")
  profile(@Req() request: IntegrationRequest) {
    return this.operations.execute("get_my_profile", {}, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/library")
  @IntegrationAction("get_my_library")
  library(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("get_my_library", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/progress")
  @IntegrationAction("get_my_progress")
  progress(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("get_my_progress", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Get("/catchup")
  @IntegrationAction("get_my_catchup")
  catchup(@Req() request: IntegrationRequest, @Query() query: unknown) {
    return this.operations.execute("get_my_catchup", query, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Post("/progress/status")
  @HttpCode(200)
  @IntegrationAction("set_media_status")
  status(@Req() request: IntegrationRequest, @Body() body: unknown) {
    return this.operations.execute("set_media_status", body, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Post("/progress/book")
  @HttpCode(200)
  @IntegrationAction("set_book_progress")
  book(@Req() request: IntegrationRequest, @Body() body: unknown) {
    return this.operations.execute("set_book_progress", body, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Post("/progress/manga")
  @HttpCode(200)
  @IntegrationAction("set_manga_progress")
  manga(@Req() request: IntegrationRequest, @Body() body: unknown) {
    return this.operations.execute("set_manga_progress", body, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Post("/progress/game")
  @HttpCode(200)
  @IntegrationAction("set_game_progress")
  game(@Req() request: IntegrationRequest, @Body() body: unknown) {
    return this.operations.execute("set_game_progress", body, request.integrationPrincipal, request.ip ?? "unknown");
  }

  @Post("/progress/episode")
  @HttpCode(200)
  @IntegrationAction("set_episode_status")
  episode(@Req() request: IntegrationRequest, @Body() body: unknown) {
    return this.operations.execute("set_episode_status", body, request.integrationPrincipal, request.ip ?? "unknown");
  }
}
