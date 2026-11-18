import { Global, Module } from "@nestjs/common";
import { ChatModule } from "@/modules/chat/chat.module";
import { CosmeticModule } from "@/modules/cosmetic/cosmetic.module";
import { ProfileController } from "./controller/profile.controller";
import { ProfileService } from "./service/profile.service";

@Global()
@Module({
  imports: [CosmeticModule, ChatModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
