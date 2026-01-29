import { Injectable } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/generated/client";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient {
	constructor(configService: ConfigService) {
		const pool = new Pool({
			connectionString: configService.get<string>("DATABASE_URL"),
		});
		const adapter = new PrismaPg(pool);

		super({
			adapter,
		});
	}
}
