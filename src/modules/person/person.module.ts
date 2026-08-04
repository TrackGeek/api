import { Module } from "@nestjs/common";
import { PersonController } from "./controller/person.controller";
import { PersonService } from "./service/person.service";
import { PersonSyncService } from "./service/person-sync.service";

@Module({
  imports: [],
  controllers: [PersonController],
  providers: [PersonService, PersonSyncService],
  exports: [PersonService, PersonSyncService],
})
export class PersonModule {}
