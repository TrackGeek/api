import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisModule } from "@nestjs-redis/client";

import { CacheService } from "./cache.service";

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        options: {
          url: configService.get<string>("REDIS_URL")!,
        },
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
