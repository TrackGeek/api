import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

import { CacheKeys, CacheService } from "../cache/cache.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class HardcoverService {
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
  
  async searchBooks(query: string) {}
  
  async getBookById(id: number): Promise<any> {}
}
