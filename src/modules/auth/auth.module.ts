import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "@/infra/prisma/prisma.module";
import { CacheModule } from "@/infra/cache/cache.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserModule } from "../user/auth.module";

@Module({
	imports: [PrismaModule, HttpModule, UserModule, ConfigModule, CacheModule],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
