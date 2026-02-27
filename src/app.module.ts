import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { CommentModule } from "./modules/comment/comment.module";
import { GameModule } from "./modules/game/game.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { IntegrationsModule } from "./shared/infra/integrations/integrations.module";
import { MovieModule } from "./modules/movie/movie.module";
import { TVShowModule } from "./modules/tv-show/tv-show.module";
import { UserModule } from "./modules/user/user.module";
import { QueueModule } from "./shared/infra/queue/queue.module";
import { EmailModule } from "./shared/infra/email/email.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FeedEventModule } from "./modules/feed-event/feed-event.module";
import { MangaModule } from "./modules/manga/manga.module";
import { BookModule } from "./modules/book/book.module";
import { AnimeModule } from "./modules/anime/anime.module";
import { FavoriteModule } from "./modules/favorite/favorite.module";
import { ListModule } from "./modules/list/list.module";
import { AnimeReviewModule } from "./modules/anime-review/anime-review.module";
import { MangaReviewModule } from './modules/manga-review/manga-review.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		JwtModule.register({ global: true }),
		HttpModule.register({ global: true }),
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
		MovieModule,
		TVShowModule,
		MangaModule,
    MangaReviewModule,
		BookModule,
		AnimeModule,
		AnimeReviewModule,
		FavoriteModule,
		ListModule,
	],
	providers: [],
	controllers: [],
	exports: [],
})
export class AppModule {}
