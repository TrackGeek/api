import { Global, Module } from "@nestjs/common";
import { ProfileController } from "./controller/profile.controller";
import { ProfileService } from "./service/profile.service";

@Global()
@Module({
  imports: [],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
