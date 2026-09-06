import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreatePostDto } from "../dto/create-post.dto";
import { UpdatePostDto } from "../dto/update-post.dto";
import { PostService } from "../service/post.service";

@ApiTags("Post")
@Controller("/post")
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Session() session: UserSession, @Body() body: CreatePostDto) {
    const post = await this.postService.createPost({ ...body, userId: session.user.id });

    return { post };
  }

  @Get("/:postId")
  async getPostById(@Param("postId", new ParseUUIDPipe({ version: "7" })) postId: string) {
    const post = await this.postService.getPostById(postId);

    return { post };
  }

  @Patch("/:postId")
  @UseGuards(AuthGuard)
  async updatePost(
    @Session() session: UserSession,
    @Param("postId", new ParseUUIDPipe({ version: "7" })) postId: string,
    @Body() body: UpdatePostDto,
  ) {
    const post = await this.postService.updatePost({ ...body, postId, userId: session.user.id });

    return { post };
  }

  @Delete("/:postId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Session() session: UserSession,
    @Param("postId", new ParseUUIDPipe({ version: "7" })) postId: string,
  ) {
    await this.postService.deletePost({ postId, userId: session.user.id });
  }
}
