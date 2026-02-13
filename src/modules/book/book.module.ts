import { Module } from "@nestjs/common";

import { BookController } from "./book.controller";
import { BookService } from "./book.service";

@Module({
	imports: [],
	controllers: [BookController],
	providers: [BookService],
	exports: [BookService],
})
export class BookModule {}
