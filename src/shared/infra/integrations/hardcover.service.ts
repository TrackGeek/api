import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

import { CacheKeys, CacheService } from "../cache/cache.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class HardcoverService {
	private readonly HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';
	
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {} 
  
  private get cacheKeys(): CacheKeys {
		return {
			searchBooks: {
				prefix: (query: string) => `hardcover:search:books:${query}`,
				expiration: 3600 * 24, // 24 hours
			},
			getBookById: {
				prefix: (id: number) => `hardcover:details:book:id:${id}`,
				expiration: 3600 * 24, // 24 hours
			},
		};
	}
  
  async searchBooks(query: string) {
		try {
			const cachedBooks = await this.cacheService.get(
				this.cacheKeys.searchBooks.prefix(query)
			);

			if (cachedBooks) {
				return cachedBooks;
			}
			
			const searchResponse = await firstValueFrom(
				this.httpService.post(this.HARDCOVER_API_URL, {
					query: `
						{
							search(
								query: "${query}",
								query_type: "book",
								per_page: 10
							) {
								results
							}
						}
					`
				}, {
					headers: {
						Authorization: `Bearer ${this.configService.get<string>('HARDCOVER_API_KEY')}`,
						'Content-Type': 'application/json',
					}
				})
			);
			
			const searchData = searchResponse.data.data.search;
			
			const hits = searchData.results.hits
			
			const books = hits.map((hit) => ({
				id: hit.document.id,
				title: hit.document.title,
				authors: hit.document.author_names,
				imageUrl: hit.document.image.url,
			}));
			
			return books
		} catch (error) {
			throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
		}
	}
  
  async getBookById(id: number): Promise<any> {}
}
