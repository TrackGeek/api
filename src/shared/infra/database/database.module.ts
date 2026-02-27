import { Global, Module } from "@nestjs/common";

import { DatabaseService } from "./database.service";

@Global()
@Module({
  imports: [],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
