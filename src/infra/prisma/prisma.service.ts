import { Injectable } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

import { PrismaClient } from "@prisma/generated/client";

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
