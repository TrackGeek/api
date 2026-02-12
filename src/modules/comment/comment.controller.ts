import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { CommentService } from './comment.service';
import { AddCommentToProfileDto } from './dtos/add-comment-to-profile.dto';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { AddCommentToGameDto } from './dtos/add-comment-to-game.dto';
import { AddCommentToMangaDto } from './dtos/add-comment-to-manga.dto';
import { AddCommentToAnimeDto } from './dtos/add-comment-to-anime.dto';
import { AddCommentToTVShowDto } from './dtos/add-comment-to-tv-show.dto';
import { AddCommentToBookDto } from './dtos/add-comment-to-book.dto';
import { AddCommentToMovieDto } from './dtos/add-comment-to-movie.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentService: CommentService
  ) {}
  
  @Post('/profile')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToProfile(
    @Session() session: UserSession,
    @Body() body: AddCommentToProfileDto
  ) {
    await this.commentService.addCommentToProfile({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/profile/:id')
  async getCommentsByProfileId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByProfileId(id);
    
    return { comments };
  }
  
  @Post('/game')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToGame(
    @Session() session: UserSession,
    @Body() body: AddCommentToGameDto
  ) {
    await this.commentService.addCommentToGame({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/game/:id')
  async getCommentsByGameId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByGameId(id);
    
    return { comments };
  }
  
  @Post('/manga')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToManga(
    @Session() session: UserSession,
    @Body() body: AddCommentToMangaDto
  ) {
    await this.commentService.addCommentToManga({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/manga/:id')
  async getCommentsByMangaId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByMangaId(id);
    
    return { comments };
  }
  
  @Post('/anime')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToAnime(
    @Session() session: UserSession,
    @Body() body: AddCommentToAnimeDto
  ) {
    await this.commentService.addCommentToAnime({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/anime/:id')
  async getCommentsByAnimeId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByAnimeId(id);
    
    return { comments };
  }
  
  @Post('/tv')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToTVShow(
    @Session() session: UserSession,
    @Body() body: AddCommentToTVShowDto
  ) {
    await this.commentService.addCommentToTVShow({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/tv/:id')
  async getCommentsByTVShowId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByTVShowId(id);
    
    return { comments };
  }
  
  @Post('/book')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToBook(
    @Session() session: UserSession,
    @Body() body: AddCommentToBookDto
  ) {
    await this.commentService.addCommentToBook({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/book/:id')
  async getCommentsByBookId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByBookId(id);
    
    return { comments };
  }
  
  @Post('/movie')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToMovie(
    @Session() session: UserSession,
    @Body() body: AddCommentToMovieDto
  ) {
    await this.commentService.addCommentToMovie({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/movie/:id')
  async getCommentsByMovieId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByMovieId(id);
    
    return { comments };
  }
}