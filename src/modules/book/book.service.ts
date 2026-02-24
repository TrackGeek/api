import { Injectable } from "@nestjs/common";
import { Book } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import {
	type CacheKeys,
	CacheService,
} from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import type { RefreshBookDto } from "./dtos/refresh-book.dto";
import type { SearchBookDto } from "./dtos/search-book.dto";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";

@Injectable()
export class BookService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly databaseService: DatabaseService,
		private readonly integrationsService: IntegrationsService,
	) {}

	private get cacheKeys(): CacheKeys {
		return {
			bookById: {
				prefix: (id: number) => `book:id:${id}`,
				expiration: 3600 * 6, // 6 hours
			},
		};
	}

	async searchBooks(searchBookDto: SearchBookDto) {
		return this.integrationsService.hardcover.searchBooks(searchBookDto.query);
	}

	async getBookById(id: number) {
		const cachedBook = await this.cacheService.get<Book>(
			this.cacheKeys.bookById.prefix(id),
		);

		if (cachedBook) {
			return cachedBook;
		}

		let book = await this.databaseService.book.findUnique({
			where: { hardcoverId: id },
		});

		if (!book) {
			const jikanBook =
				await this.integrationsService.hardcover.getBookById(id);

			book = await this.databaseService.book.create({
				data: jikanBook,
			});
		}

		await this.cacheService.set(
			this.cacheKeys.bookById.prefix(id),
			book,
			this.cacheKeys.bookById.expiration,
		);

		return book;
	}

	async refreshBook(refreshBookDto: RefreshBookDto) {
		const book = await this.databaseService.book.findUnique({
			where: { hardcoverId: refreshBookDto.id },
		});

		if (!book) {
			throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
		}

		if (Date.now() - book.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
			throw new AppException(ERROR_CODES.BOOK_ALREADY_REFRESHED);
		}

		if (
			await this.cacheService.exists(
				this.cacheKeys.bookById.prefix(book.hardcoverId),
			)
		) {
			await this.cacheService.delete(
				this.cacheKeys.bookById.prefix(book.hardcoverId),
			);
		}

		const hardcoverBook = await this.integrationsService.hardcover.getBookById(
			book.hardcoverId,
		);

		await this.databaseService.book.update({
			where: { hardcoverId: refreshBookDto.id },
			data: hardcoverBook,
		});

		await this.cacheService.set(
			this.cacheKeys.bookById.prefix(book.hardcoverId),
			book,
			this.cacheKeys.bookById.expiration,
		);
	}
}
