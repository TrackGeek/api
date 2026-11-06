import { Global, Module } from "@nestjs/common";
import { DataxamasLogger } from "./dataxamas.logger";
import { DataxamasService } from "./dataxamas.service";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [DataxamasService, DataxamasLogger],
  exports: [DataxamasService, DataxamasLogger],
})
export class DataxamasModule {}
