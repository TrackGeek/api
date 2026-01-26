import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";

import { PrismaModule } from "@/infra/prisma/prisma.module";
import { R2Module } from "@/infra/r2/r2.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
	imports: [PrismaModule, HttpModule, R2Module],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
