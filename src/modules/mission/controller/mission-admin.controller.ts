import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/generated/enums";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { Roles } from "@/shared/decorators/roles.decorator";
import { RolesGuard } from "@/shared/guards/roles.guard";
import { CreateMissionDto } from "../dto/create-mission.dto";
import { UpdateMissionDto } from "../dto/update-mission.dto";
import { MissionService } from "../service/mission.service";

@ApiTags("Mission")
@Controller("/admin/missions")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Administrator)
export class MissionAdminController {
  constructor(private readonly missionService: MissionService) {}

  @Get("/")
  async listMissions() {
    const missions = await this.missionService.listMissions();

    return { missions };
  }

  @Post("/")
  async createMission(@Body() body: CreateMissionDto) {
    const mission = await this.missionService.createMission(body);

    return { mission };
  }

  @Patch("/:missionId")
  async updateMission(@Param("missionId") missionId: string, @Body() body: UpdateMissionDto) {
    const mission = await this.missionService.updateMission(missionId, body);

    return { mission };
  }

  @Delete("/:missionId")
  @HttpCode(204)
  async deleteMission(@Param("missionId") missionId: string) {
    await this.missionService.deleteMission(missionId);
  }
}
