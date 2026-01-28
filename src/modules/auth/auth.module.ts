import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";

import { PrismaModule } from "@/infra/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserModule } from "../user/auth.module";

@Module({
	imports: [PrismaModule, HttpModule, UserModule],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
