import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateReportDto } from "../dto/create-report.dto";
import { ReportService } from "../service/report.service";

@ApiTags("Report")
@Controller("/report")
@UseGuards(AuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Session() session: UserSession, @Body() body: CreateReportDto) {
    const report = await this.reportService.createReport(session.user.id, body);

    return { report };
  }
}
