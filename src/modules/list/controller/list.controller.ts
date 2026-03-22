import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AddItemToListDto } from "../dto/add-item-to-list.dto";
import { CreateListDto } from "../dto/create-list.dto";
import { GetItemsByListIdDto } from "../dto/get-items-by-list-id.dto";
import { GetListsByUserIdDto } from "../dto/get-lists-by-user-id.dto";
import { RemoveItemFromListDto } from "../dto/remove-item-from-list.dto";
import { ListService } from "../service/list.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("List")
@Controller("/list")
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createList(@Session() session: UserSession, @Body() body: CreateListDto) {
    await this.listService.createList({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/user/:userId")
  async getListsByUserId(@Param("userId", new ParseUUIDPipe()) userId: string, @Query() query: GetListsByUserIdDto) {
    const lists = await this.listService.getListsByUserId({
      ...query,
      userId,
    });

    return { lists };
  }

  @Get("/:listId")
  async getListById(@Param("listId", new ParseUUIDPipe()) listId: string) {
    const list = await this.listService.getListById(listId);

    return { list };
  }

  @Get("/:listId/item")
  async getItemsByListId(@Param("listId", new ParseUUIDPipe()) listId: string, @Query() query: GetItemsByListIdDto) {
    const listItems = await this.listService.getItemsByListId({
      ...query,
      listId,
    });

    return { listItems };
  }

  @Post("/:listId/item")
  @UseGuards(AuthGuard)
  async addItemToList(
    @Param("listId", new ParseUUIDPipe()) listId: string,
    @Session() session: UserSession,
    @Body() body: AddItemToListDto,
  ) {
    await this.listService.addItemToList({
      ...body,
      userId: session.user.id,
      listId,
    });
  }

  @Delete("/:listId/item")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItemFromList(
    @Param("listId", new ParseUUIDPipe()) listId: string,
    @Session() session: UserSession,
    @Body() body: RemoveItemFromListDto,
  ) {
    await this.listService.removeItemFromList({
      ...body,
      userId: session.user.id,
      listId,
    });
  }
}
