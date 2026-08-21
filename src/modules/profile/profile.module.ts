import { Global, Module } from "@nestjs/common";
import { CosmeticModule } from "@/modules/cosmetic/cosmetic.module";
import { ProfileController } from "./controller/profile.controller";
import { ProfileService } from "./service/profile.service";

@Global()
@Module({
  imports: [CosmeticModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
