import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { ActivityModule } from "./modules/activity/activity.module";
import { AnimeModule } from "./modules/anime/anime.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookModule } from "./modules/book/book.module";
import { CatchupModule } from "./modules/catchup/catchup.module";
import { CoinModule } from "./modules/coin/coin.module";
import { CommentModule } from "./modules/comment/comment.module";
import { CompanyModule } from "./modules/company/company.module";
import { CosmeticModule } from "./modules/cosmetic/cosmetic.module";
import { DiscordModule } from "./modules/discord/discord.module";
import { FavoriteModule } from "./modules/favorite/favorite.module";
import { GameModule } from "./modules/game/game.module";
import { ListModule } from "./modules/list/list.module";
import { MangaModule } from "./modules/manga/manga.module";
import { MissionModule } from "./modules/mission/mission.module";
import { MovieModule } from "./modules/movie/movie.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PersonModule } from "./modules/person/person.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { TVShowModule } from "./modules/tv-show/tv-show.module";
import { UserModule } from "./modules/user/user.module";
import { XpModule } from "./modules/xp/xp.module";
import { HttpThrottlerGuard } from "./shared/guards/http-throttler.guard";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { EmailModule } from "./shared/infra/email/email.module";
import { HealthModule } from "./shared/infra/health/health.module";
import { IntegrationsModule } from "./shared/infra/integrations/integrations.module";
import { QueueModule } from "./shared/infra/queue/queue.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { MediaFilterModule } from "./shared/media-filter/media-filter.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "read", ttl: 60_000, limit: 500, blockDuration: 300_000 },
        { name: "write", ttl: 60_000, limit: 250, blockDuration: 300_000 },
      ],
    }),
    JwtModule.register({ global: true }),
    HttpModule.register({ global: true }),
    HealthModule,
    EmailModule,
    QueueModule,
    DatabaseModule,
    MediaFilterModule,
    AuthModule,
    ActivityModule,
    CacheModule,
    IntegrationsModule,
    UploadModule,
    UserModule,
    ProfileModule,
    CommentModule,
    ReactionModule,
    NotificationModule,
    GameModule,
    MovieModule,
    TVShowModule,
    MangaModule,
    BookModule,
    AnimeModule,
    PersonModule,
    CompanyModule,
    FavoriteModule,
    ListModule,
    PaymentModule,
    CatchupModule,
    XpModule,
    MissionModule,
    CoinModule,
    CosmeticModule,
    DiscordModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
  ],
  controllers: [],
  exports: [],
})
export class AppModule {}
