import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { AnimeModule } from "./modules/anime/anime.module";
import { AnimeReviewModule } from "./modules/anime-review/anime-review.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookModule } from "./modules/book/book.module";
import { BookReviewModule } from "./modules/book-review/book-review.module";
import { CommentModule } from "./modules/comment/comment.module";
import { FavoriteModule } from "./modules/favorite/favorite.module";
import { FeedEventModule } from "./modules/feed-event/feed-event.module";
import { GameModule } from "./modules/game/game.module";
import { GameReviewModule } from "./modules/game-review/game-review.module";
import { ListModule } from "./modules/list/list.module";
import { MangaModule } from "./modules/manga/manga.module";
import { MangaReviewModule } from "./modules/manga-review/manga-review.module";
import { MovieModule } from "./modules/movie/movie.module";
import { MovieReviewModule } from "./modules/movie-review/movie-review.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { TVShowModule } from "./modules/tv-show/tv-show.module";
import { TVShowReviewModule } from "./modules/tv-show-review/tv-show-review.module";
import { UserModule } from "./modules/user/user.module";
import { HttpThrottlerGuard } from "./shared/guards/http-throttler.guard";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { EmailModule } from "./shared/infra/email/email.module";
import { IntegrationsModule } from "./shared/infra/integrations/integrations.module";
import { QueueModule } from "./shared/infra/queue/queue.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { GameProgressModule } from './modules/game-progress/game-progress.module';
import { MovieProgressModule } from './modules/movie-progress/movie-progress.module';
import { MangaProgressModule } from './modules/manga-progress/manga-progress.module';
import { BookProgressModule } from './modules/book-progress/book-progress.module';
import { AnimeProgressModule } from './modules/anime-progress/anime-progress.module';
import { TVShowProgressModule } from './modules/tv-show-progress/tv-show-progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    HttpModule.register({ global: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "read", ttl: 60_000, limit: 30, blockDuration: 300_000 },
        { name: "write", ttl: 60_000, limit: 5, blockDuration: 300_000 },
      ],
    }),
    EmailModule,
    QueueModule,
    DatabaseModule,
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
    GameProgressModule,
    GameReviewModule,
    MovieModule,
    MovieProgressModule,
    MovieReviewModule,
    TVShowModule,
    TVShowProgressModule,
    TVShowReviewModule,
    MangaModule,
    MangaProgressModule,
    MangaReviewModule,
    BookModule,
    BookProgressModule,
    BookReviewModule,
    AnimeModule,
    AnimeProgressModule,
    AnimeReviewModule,
    FavoriteModule,
    ListModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: HttpThrottlerGuard }],
  controllers: [],
  exports: [],
})
export class AppModule {}
