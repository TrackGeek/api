import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";

import { PrismaModule } from "@/infra/prisma/prisma.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { ImgBBModule } from "@/infra/imgbb/imgbb.module";

@Module({
	imports: [PrismaModule, HttpModule, ImgBBModule],
	controllers: [UserController],
	providers: [UserService],
	exports: [UserService],
})
export class UserModule {}
