import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { MissionService } from "../service/mission.service";

@ApiTags("Mission")
@Controller("/missions")
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  @Get("/me")
  @UseGuards(AuthGuard)
  async getMyMissions(@Session() session: UserSession) {
    const missions = await this.missionService.getMissionsByUserId(session.user.id);

    return { missions };
  }

  @Get("/user/:userId")
  async getMissionsByUserId(@Param("userId") userId: string) {
    const missions = await this.missionService.getMissionsByUserId(userId);

    return { missions };
  }
}
