import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { AnimeModule } from "./modules/anime/anime.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookModule } from "./modules/book/book.module";
import { CommentModule } from "./modules/comment/comment.module";
import { FavoriteModule } from "./modules/favorite/favorite.module";
import { FeedEventModule } from "./modules/feed-event/feed-event.module";
import { GameModule } from "./modules/game/game.module";
import { ListModule } from "./modules/list/list.module";
import { MangaModule } from "./modules/manga/manga.module";
import { MovieModule } from "./modules/movie/movie.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { TVShowModule } from "./modules/tv-show/tv-show.module";
import { UserModule } from "./modules/user/user.module";
import { HttpThrottlerGuard } from "./shared/guards/http-throttler.guard";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { EmailModule } from "./shared/infra/email/email.module";
import { HealthModule } from "./shared/infra/health/health.module";
import { IntegrationsModule } from "./shared/infra/integrations/integrations.module";
import { MetricsModule } from "./shared/infra/metrics/metrics.module";
import { QueueModule } from "./shared/infra/queue/queue.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { MetricsInterceptor } from "./shared/interceptors/metrics.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "read", ttl: 60_000, limit: 200, blockDuration: 300_000 },
        { name: "write", ttl: 60_000, limit: 100, blockDuration: 300_000 },
      ],
    }),
    MetricsModule,
    JwtModule.register({ global: true }),
    HttpModule.register({ global: true }),
    EmailModule,
    QueueModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    FeedEventModule,
    CacheModule,
    IntegrationsModule,
    UploadModule,
    UserModule,
    ProfileModule,
    CommentModule,
    ReactionModule,
    GameModule,
    MovieModule,
    TVShowModule,
    MangaModule,
    BookModule,
    AnimeModule,
    FavoriteModule,
    ListModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  controllers: [],
  exports: [],
})
export class AppModule {}
