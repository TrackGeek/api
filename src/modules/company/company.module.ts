import { Module } from "@nestjs/common";
import { CompanyController } from "./controller/company.controller";
import { CompanyService } from "./service/company.service";

@Module({
  imports: [],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
