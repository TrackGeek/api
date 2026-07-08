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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AddItemToListDto } from "../dto/add-item-to-list.dto";
import { CreateListDto } from "../dto/create-list.dto";
import { GetItemsByListIdDto } from "../dto/get-items-by-list-id.dto";
import { GetListStatusDto } from "../dto/get-list-status.dto";
import { GetListsByUserIdDto } from "../dto/get-lists-by-user-id.dto";
import { GetListsContainingItemDto } from "../dto/get-lists-containing-item.dto";
import { RemoveItemFromListDto } from "../dto/remove-item-from-list.dto";
import { UpdateListDto } from "../dto/update-list.dto";
import { ListService } from "../service/list.service";

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

  @Get("/status")
  @UseGuards(AuthGuard)
  async getListStatus(@Session() session: UserSession, @Query() query: GetListStatusDto) {
    const listIds = await this.listService.getListStatus({
      ...query,
      userId: session.user.id,
    });

    return { listIds };
  }

  @Get("/containing")
  async getListsContainingItem(@Query() query: GetListsContainingItemDto) {
    const lists = await this.listService.getListsContainingItem(query);

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

  @Patch("/:listId")
  @UseGuards(AuthGuard)
  async updateList(
    @Param("listId", new ParseUUIDPipe()) listId: string,
    @Session() session: UserSession,
    @Body() body: UpdateListDto,
  ) {
    await this.listService.updateList({
      ...body,
      userId: session.user.id,
      listId,
    });
  }

  @Delete("/:listId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteList(@Param("listId", new ParseUUIDPipe()) listId: string, @Session() session: UserSession) {
    await this.listService.deleteList({
      listId,
      userId: session.user.id,
    });
  }
}
