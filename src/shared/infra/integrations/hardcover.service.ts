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
				id: Number(hit.document.id),
				title: hit.document.title,
				alternativeTitles: hit.document.alternative_titles,
				authors: hit.document.author_names,
				imageUrl: hit.document.image.url,
			}));
			
			return books
		} catch (error) {
			throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
		}
	}
  
  async getBookById(id: number): Promise<any> {
		try {
			const cachedBook = await this.cacheService.get(
				this.cacheKeys.getBookById.prefix(id)
			);

			if (cachedBook) {
				return cachedBook;
			}
			
			const bookResponse = await firstValueFrom(
				this.httpService.post(this.HARDCOVER_API_URL, {
					variables: { id },
					query: `
						query GetBookById($id: Int!) {
							books_by_pk(id: $id) {
								audio_seconds
								book_category_id
								compilation
								default_audio_edition {
									id
									image {
										url
									}
									title
								}
								default_cover_edition {
									id
									image {
										url
									}
									title
								}
								default_ebook_edition {
									id
									image {
										url
									}
									title
								}
								default_physical_edition {
									id
									image {
										url
									}
									title
									alternative_titles
								}
								description
								editions(limit: 30) {
									id
									title
									image {
										url
									}
								}
								editions_count
								headline
								featured_book_series {
									id
									book {
										image {
											url
										}
										id
										title
									}
								}
								id
								image {
									url
								}
								links
								literary_type_id
								pages
								release_date
								release_year
								slug
								state
								subtitle
								title
								canonical {
									id
									image {
										url
									}
									title
								}
								alternative_titles
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
			
			console.log(bookResponse.data)
			
			const bookData = bookResponse.data.data.books_by_pk;
			
			const book = {
				hardcoverId: bookData.id,
				title: bookData.title,
				alternativeTitles: bookData.alternative_titles,
				audioSeconds: bookData.audio_seconds,
				bookCategoryId: bookData.book_category_id,
				bookStatus: bookData.bookStatus,
				canonical: bookData.canonical,
				compilation: bookData.compilation,
				curationStatus: bookData.curation_status,
				defaultAudioEdition: bookData.default_audio_edition ? {
					id: bookData.default_audio_edition.id,
					imageUrl: bookData.default_audio_edition.image.url ?? null,
					title: bookData.default_audio_edition.title,
				} : null,
				defaultCoverEdition: bookData.default_cover_edition ? {
					id: bookData.default_cover_edition.id,
					imageUrl: bookData.default_cover_edition.image.url ?? null,
					title: bookData.default_cover_edition.title,
				} : null,
				defaultEbookEdition: bookData.default_ebook_edition ? {
					id: bookData.default_ebook_edition.id,
					imageUrl: bookData.default_ebook_edition.image.url ?? null,
					title: bookData.default_ebook_edition.title,
				} : null,
				defaultPhysicalEdition: bookData.default_physical_edition ? {
					id: bookData.default_physical_edition.id,
					imageUrl: bookData.default_physical_edition.image.url ?? null,
					title: bookData.default_physical_edition.title,
					alternativeTitles: bookData.default_physical_edition.alternative_titles,
				} : null,
				description: bookData.description,
				editionsCount: bookData.editions_count,
				featuredBookSeries: bookData.featured_book_series ? {
					id: bookData.featured_book_series.id,
					book: {
						id: bookData.featured_book_series.book.id,
						title: bookData.featured_book_series.book.title,
						imageUrl: bookData.featured_book_series.book.image.url ?? null,
					}
				} : {},
				headline: bookData.headline,
				imageUrl: bookData.image.url ?? null,
				links: bookData.links,
				literaryTypeId: bookData.literary_type_id,
				numberOfPages: bookData.pages,
				releaseDate: bookData.release_date ? new Date(bookData.release_date) : null,
				releaseYear: bookData.release_year,
				slug: bookData.slug,
				state: bookData.state,
				subtitle: bookData.subtitle,
				editions: bookData.editions ? bookData.editions.map(edition => ({
					id: edition.id,
					title: edition.title,
					imageUrl: edition.image?.url ?? null,
				})) : [],
			}
			
			await this.cacheService.set(
				this.cacheKeys.getBookById.prefix(id),
				book,
				this.cacheKeys.getBookById.expiration
			);
			
			return book;
		} catch (error) {
			throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
		}
	}
}
