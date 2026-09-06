import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module";
import { AnimeModule } from "../anime/anime.module";
import { BookModule } from "../book/book.module";
import { GameModule } from "../game/game.module";
import { MangaModule } from "../manga/manga.module";
import { MovieModule } from "../movie/movie.module";
import { TVShowModule } from "../tv-show/tv-show.module";
import { PostController } from "./controller/post.controller";
import { PostService } from "./service/post.service";

@Module({
  imports: [ActivityModule, AnimeModule, MangaModule, TVShowModule, MovieModule, GameModule, BookModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
