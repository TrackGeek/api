import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CompanyService } from "../service/company.service";

@ApiTags("Company")
@Controller()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get("/movie/company/:companyId")
  async getMovieCompany(@Param("companyId", new ParseIntPipe()) companyId: number) {
    const company = await this.companyService.getMovieCompany(companyId);

    return { company };
  }

  @Get("/tv/company/:companyId")
  async getTVShowCompany(@Param("companyId", new ParseIntPipe()) companyId: number) {
    const company = await this.companyService.getTVShowCompany(companyId);

    return { company };
  }

  @Get("/anime/company/:companyId")
  async getAnimeCompany(@Param("companyId", new ParseIntPipe()) companyId: number) {
    const company = await this.companyService.getAnimeCompany(companyId);

    return { company };
  }

  @Get("/game/company/:companyId")
  async getGameCompany(@Param("companyId", new ParseIntPipe()) companyId: number) {
    const company = await this.companyService.getGameCompany(companyId);

    return { company };
  }
}
