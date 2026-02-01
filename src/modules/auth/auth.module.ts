import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@/shared/infra/cache/cache.module";
import { PrismaModule } from "@/shared/infra/prisma/prisma.module";
import { UserModule } from "../user/auth.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
	imports: [PrismaModule, HttpModule, UserModule, ConfigModule, CacheModule],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
