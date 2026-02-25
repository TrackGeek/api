import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { ListService } from './list.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { CreateListDto } from './dtos/create-list.dto';
import { AddItemToListDto } from './dtos/add-item-to-list.dto';
import { RemoveItemFromListDto } from './dtos/remove-item-from-list.dto';
import { GetListsByUserIdDto } from './dtos/get-lists-by-user-id.dto';
import { GetItemsByListIdDto } from './dtos/get-items-by-list-id.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("list")
export class ListController {
  constructor(private readonly listService: ListService) {}
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createList(@Session() session: UserSession, @Body() body: CreateListDto) {
    await this.listService.createList({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get('/user/:userId')
  @HttpCode(HttpStatus.OK)
  async getListsByUserId(@Param('userId', new ParseUUIDPipe()) userId: string, @Query() query: GetListsByUserIdDto) {
    const lists = await this.listService.getListsByUserId({
      userId,
      itemsPerPage: query.itemsPerPage,
      page: query.page,
    });
    
    return { lists }
  }
  
  @Get('/:listId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getListById(@Param('listId', new ParseUUIDPipe()) listId: string) {
    const list = await this.listService.getListById(listId);
    
    return { list };
  }
  
  @Get('/:listId/item')
  @HttpCode(HttpStatus.OK)
  async getItemsByListId(@Param('listId', new ParseUUIDPipe()) listId: string, @Query() query: GetItemsByListIdDto) {
    const listItems = await this.listService.getItemsByListId({
      listId,
      itemsPerPage: query.itemsPerPage,
      page: query.page,
    });
    
    return { listItems }
  }
  
  @Post('/:listId/item')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async addItemToList(
    @Param('listId', new ParseUUIDPipe()) listId: string, 
    @Session() session: UserSession,
    @Body() body: AddItemToListDto
  ) {
    await this.listService.addItemToList({
      ...body,
      userId: session.user.id,
      listId,
    });
  }
  
  @Delete('/:listId/item')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async removeItemFromList(
    @Param('listId', new ParseUUIDPipe()) listId: string, 
    @Session() session: UserSession,
    @Body() body: RemoveItemFromListDto
) {
    await this.listService.removeItemFromList({
      ...body,
      userId: session.user.id,
      listId,
    });
  }
}
