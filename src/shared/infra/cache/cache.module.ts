import { Module } from "@nestjs/common";
import { RedisModule } from "@liaoliaots/nestjs-redis";
import { ConfigService } from '@nestjs/config';

import { CacheService } from "./cache.service";

@Module({
	imports: [
		RedisModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				config: {
					host: configService.get<string>('REDIS_HOST')!,
					port: configService.get<number>('REDIS_PORT')!,
					password: configService.get<string>('REDIS_PASSWORD')!,
				},
			}),
		})
	],
	providers: [CacheService],
	exports: [CacheService],
})
export class CacheModule {}
