import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/generated/enums";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { Roles } from "@/shared/decorators/roles.decorator";
import { RolesGuard } from "@/shared/guards/roles.guard";
import { ListReportsDto } from "../dto/list-reports.dto";
import { UpdateReportDto } from "../dto/update-report.dto";
import { ReportService } from "../service/report.service";

@ApiTags("Report")
@Controller("/admin/reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Administrator)
export class ReportAdminController {
  constructor(private readonly reportService: ReportService) {}

  @Get("/")
  async listReports(@Query() query: ListReportsDto) {
    const reports = await this.reportService.listReports(query);

    return { reports };
  }

  @Patch("/:reportId")
  async updateReport(
    @Session() session: UserSession,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Body() body: UpdateReportDto,
  ) {
    const report = await this.reportService.updateReport(session.user.id, reportId, body);

    return { report };
  }
}
