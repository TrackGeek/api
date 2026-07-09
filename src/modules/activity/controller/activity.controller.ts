import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetActivitiesDto } from "../dto/get-activities.dto";
import { GetActivitiesByUserDto } from "../dto/get-activities-by-user.dto";
import { ActivityService } from "../service/activity.service";
import { GetActivitiesByUserFollowingDto } from '../dto/get-activities-by-user-following.dto';

@ApiTags("Activity")
@Controller("/activities")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get("/global")
  async getActivities(@Query() query: GetActivitiesDto) {
    const activities = await this.activityService.getActivities(query);

    return { activities };
  }

  @Get("/user/:userId")
  async getActivitiesByUserId(@Param("userId") userId: string, @Query() query: GetActivitiesByUserDto) {
    const activities = await this.activityService.getActivitiesByUserId({
      ...query,
      userId,
    });

    return { activities };
  }
  
  @Get("/user/:userId/calendar")
  async getUserActivityCalendarById(@Param("userId") userId: string) {
    const activityCalendar = await this.activityService.getUserActivityCalendarById(userId);

    return { activityCalendar };
  }
  
  @Get("/following")
  @UseGuards(AuthGuard)
  async getActivitiesByUserFollowing(@Session() session: UserSession, @Query() query: GetActivitiesByUserFollowingDto) {
    const activities = await this.activityService.getActivitiesByUserFollowing({
      ...query,
      userId: session.user.id,
    });

    return { activities };
  }
}
