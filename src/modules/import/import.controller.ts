import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AnilistJobService } from "./anilist-job.service";
import { AnilistSnapshotDto } from "./anilist-snapshot.dto";
import { StartAnilistJobDto } from "./start-anilist-job.dto";

@ApiTags("Import")
@Controller("/import")
@UseGuards(AuthGuard)
export class ImportController {
  constructor(private readonly anilist: AnilistJobService) {}

  @Get("/anilist/snapshot")
  @Header("Cache-Control", "no-store")
  @Throttle({ read: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Collect a public AniList library for review without importing it" })
  snapshot(@Query() query: AnilistSnapshotDto, @Session() session: UserSession) {
    return this.anilist.snapshot(query.username, session.user.id);
  }

  @Post("/anilist/jobs")
  @Throttle({ write: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Import the reviewed AniList snapshot into the current account" })
  start(@Body() body: StartAnilistJobDto, @Session() session: UserSession) {
    return this.anilist.start(body.snapshotId, session.user.id);
  }

  @Get("/anilist/jobs/:jobId")
  @Header("Cache-Control", "no-store")
  status(@Param("jobId", new ParseUUIDPipe()) jobId: string, @Session() session: UserSession) {
    return this.anilist.status(jobId, session.user.id);
  }

  @Get("/anilist/jobs/:jobId/failures")
  @Header("Cache-Control", "no-store")
  failures(@Param("jobId", new ParseUUIDPipe()) jobId: string, @Session() session: UserSession) {
    return this.anilist.failures(jobId, session.user.id);
  }
}
