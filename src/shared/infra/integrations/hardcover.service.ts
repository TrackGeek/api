import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { CacheService } from "../cache/cache.service";

export enum HardcoverBookFilter {
  Trending = "trending",
  ComingSoon = "comingSoon",
}

export interface HardcoverTopBookOptions {
  page?: number;
  filter?: HardcoverBookFilter;
}

export interface HardcoverSearchBookResult {
  id: number;
  title: string;
  alternativeTitles: string[];
  authors: string[];
  imageUrl: string;
  genres: string[];
}

export interface HardcoverTopBookResult {
  id: number;
  title: string;
  alternativeTitles: string[];
  authors: { name: string; id: number }[];
  imageUrl: string;
}

export interface HardcoverEdition {
  id: number;
  title: string;
  imageUrl: string | null;
  language: string | null;
}

export interface HardcoverBookDetails {
  hardcoverId: number;
  title: string;
  alternativeTitles: string[] | null;
  audioSeconds: number | null;
  taggings: {
    id: number;
    tag: string;
    category: string;
    categoryId: number;
  }[];
  bookCategory: {
    id: number;
    name: string;
  } | null;
  bookStatus: unknown;
  contributions: {
    contribution: string;
    author: {
      name: string;
      id: number;
      image: { url: string | null };
    };
  }[];
  canonical: {
    id: number;
    image: { url: string | null };
    title: string;
  } | null;
  compilation: boolean | null;
  curationStatus: unknown;
  defaultAudioEdition: HardcoverEdition | null;
  defaultCoverEdition: HardcoverEdition | null;
  defaultEbookEdition: HardcoverEdition | null;
  defaultPhysicalEdition: (HardcoverEdition & { alternativeTitles: string[] | null }) | null;
  description: string | null;
  editionsCount: number;
  featuredBookSeries: {
    id: number;
    book: {
      id: number;
      title: string;
      imageUrl: string | null;
    };
  } | null;
  headline: string | null;
  imageUrl: string | null;
  links: unknown;
  literaryTypeId: number | null;
  numberOfPages: number | null;
  releaseDate: Date | null;
  releaseYear: number | null;
  slug: string;
  state: string;
  subtitle: string | null;
  editions: HardcoverEdition[];
  series: {
    series_id: number;
    details: string | null;
  };
}

@Injectable()
export class HardcoverService {
  private readonly logger = new Logger(HardcoverService.name);

  private readonly HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async searchBooks(query: string): Promise<HardcoverSearchBookResult[]> {
    try {
      const cachedBooks = await this.cacheService.get<HardcoverSearchBookResult[]>(
        CACHE_KEYS.HARDCOVER_SEARCH_BOOKS.prefix(query),
      );

      if (cachedBooks) {
        return cachedBooks;
      }

      const searchResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
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
					`,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>("HARDCOVER_API_KEY")}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      const searchData = searchResponse.data.data.search;

      const hits = searchData.results.hits;

      const books = hits.map((hit) => ({
        id: Number(hit.document.id),
        title: hit.document.title,
        alternativeTitles: hit.document.alternative_titles,
        authors: hit.document.author_names,
        imageUrl: hit.document.image.url,
        genres: hit.document.genres ?? [],
      }));

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_SEARCH_BOOKS.prefix(query),
        books,
        CACHE_KEYS.HARDCOVER_SEARCH_BOOKS.expiration,
      );

      return books;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
      }

      this.logger.error(
        `Failed to search books from Hardcover API for query "${query}": ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
    }
  }

  async topBooks({ page = DEFAULT_PAGINATION_PAGE, filter = HardcoverBookFilter.Trending }: HardcoverTopBookOptions) {
    try {
      const topBooksOptions = { page, filter };
      const cachedBooks = await this.cacheService.get<HardcoverTopBookResult[]>(
        CACHE_KEYS.HARDCOVER_TOP_BOOKS.prefix({ ...topBooksOptions }),
      );

      if (cachedBooks) {
        return cachedBooks;
      }

      const queries: Record<HardcoverBookFilter, string> = {
        trending: `
          query TrendingBooks {
            books_aggregate {
              aggregate {
                count
              }
            }
            
            books(
              order_by: { users_read_count: desc }
              limit: 16
              offset: ${(page - 1) * 16}
            ) {
              id
              title
              image {
                url
              }
              contributions {
                author {
                  id
                  name
                }
              }
              alternative_titles
              description
              release_year
            }
          }
        `,
        comingSoon: `
          query UpcomingBooks {
            books_aggregate(
              where: { release_date: { _gt: "${new Date().toISOString().split("T")[0]}" } }
            ) {
              aggregate {
                count
              }
            }
            
            books(
              where: { release_date: { _gt: "${new Date().toISOString().split("T")[0]}" } }
              order_by: { release_date: asc }
              limit: 16
              offset: ${(page - 1) * 16}
            ) { 
              id
              title 
              image {
                url
              }
              contributions {
                author {
                  id
                  name
                }
              }
              alternative_titles
              description
              release_year
            }
          }
        `,
      };

      const topBookResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            query: queries[filter],
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>("HARDCOVER_API_KEY")}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      if (!topBookResponse.data?.data) {
        throw new Error("API Response returned null");
      }

      const responseData = topBookResponse.data.data;

      if (!responseData.books_aggregate) {
        this.logger.error("Response unexpected:", JSON.stringify(responseData));
        throw new Error("Response does not contain books_aggregate");
      }

      const topData = responseData.books || [];
      const totalCount = responseData.books_aggregate?.aggregate?.count || 0;

      const items = topData.map((book) => ({
        id: Number(book.id),
        title: book.title,
        alternativeTitles: book.alternative_titles,
        authors: book.contributions?.map(({ author }) => ({ name: author.name, id: author.id })) || [],
        imageUrl: book.image?.url ?? "",
        releaseYear: book.release_year,
        description: book.description,
      }));

      const limit = 16;
      const currentOffset = (page - 1) * limit;

      const paginationData = {
        has_next_page: currentOffset + limit < totalCount,
        items: {
          total: totalCount,
          count: topData.length,
        },
      };

      const topBooks = {
        hasNextPage: paginationData.has_next_page,
        nextCursor: paginationData.has_next_page ? Number(page + 1) : null,
        total: paginationData.items.total,
        count: paginationData.items.count,
        items,
      };

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_TOP_BOOKS.prefix({ ...topBooksOptions }),
        topBooks,
        CACHE_KEYS.HARDCOVER_TOP_BOOKS.expiration,
      );

      return topBooks;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
      }

      this.logger.error(
        `Failed to get top books from Hardcover API for page=${page}, filter=${filter}: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
    }
  }

  async getBookByHardcoverId(hardcoverId: number): Promise<HardcoverBookDetails> {
    try {
      const cachedBook = await this.cacheService.get<HardcoverBookDetails>(
        CACHE_KEYS.HARDCOVER_BOOK_BY_ID.prefix(hardcoverId),
      );

      if (cachedBook) {
        return cachedBook;
      }

      const bookCategoriesResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            query: `
            {
              book_categories {
                id
                name
              }
            }
          `,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>("HARDCOVER_API_KEY")}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      const bookCategories = bookCategoriesResponse.data.data.book_categories;

      const bookResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            variables: { id: hardcoverId },
            query: `
						query GetBookById($id: Int!) {
							books_by_pk(id: $id) {
								audio_seconds
								book_category_id
								compilation
                taggings {
                  tag {
                    id
                    tag
                  }
                }
								default_audio_edition {
									id
									image {
										url
									}
									title
                  language {
                    language
                  }
								}
								default_cover_edition {
									id
									image {
										url
									}
									title
                  language {
                    language
                  }
								}
								default_ebook_edition {
									id
									image {
										url
									}
									title
                  language {
                    language
                  }
								}
								default_physical_edition {
									id
									image {
										url
									}
									title
									alternative_titles
                  language {
                    language
                  }
								}
								description
								editions(limit: 30) {
									id
									title
									image {
										url
									}
                  language {
                    language
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
								contributions {
								  contribution
                  author {
                    id
                    name
                    image {
                      url
                    }
                  }
                }
							}
						}
					`,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>("HARDCOVER_API_KEY")}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      const bookData = bookResponse.data.data.books_by_pk;

      const book = {
        hardcoverId: bookData.id,
        title: bookData.title,
        alternativeTitles: bookData.alternative_titles,
        audioSeconds: bookData.audio_seconds,
        taggings: bookData.taggings
          ? [
              ...new Map(
                bookData.taggings.map((tagging) => [
                  tagging.tag.id,
                  {
                    id: tagging.tag.id,
                    tag: tagging.tag.tag,
                    category: tagging.tag.category,
                    categoryId: tagging.tag.categoryId,
                  },
                ]),
              ).values(),
            ]
          : [],
        bookCategory: bookCategories.find((category) => category.id === bookData.book_category_id) ?? null,
        bookStatus: bookData.bookStatus,
        contributions: bookData.contributions,
        canonical: bookData.canonical,
        compilation: bookData.compilation,
        curationStatus: bookData.curation_status,
        defaultAudioEdition: bookData.default_audio_edition
          ? {
              id: bookData.default_audio_edition.id,
              imageUrl: bookData.default_audio_edition.image.url ?? null,
              title: bookData.default_audio_edition.title,
              language: bookData.default_audio_edition.language?.language ?? null,
            }
          : null,
        defaultCoverEdition: bookData.default_cover_edition
          ? {
              id: bookData.default_cover_edition.id,
              imageUrl: bookData.default_cover_edition.image.url ?? null,
              title: bookData.default_cover_edition.title,
              language: bookData.default_cover_edition.language?.language ?? null,
            }
          : null,
        defaultEbookEdition: bookData.default_ebook_edition
          ? {
              id: bookData.default_ebook_edition.id,
              imageUrl: bookData.default_ebook_edition.image.url ?? null,
              title: bookData.default_ebook_edition.title,
              language: bookData.default_ebook_edition.language?.language ?? null,
            }
          : null,
        defaultPhysicalEdition: bookData.default_physical_edition
          ? {
              id: bookData.default_physical_edition.id,
              imageUrl: bookData.default_physical_edition.image.url ?? null,
              title: bookData.default_physical_edition.title,
              alternativeTitles: bookData.default_physical_edition.alternative_titles,
              language: bookData.default_physical_edition.language?.language ?? null,
            }
          : null,
        description: bookData.description,
        editionsCount: bookData.editions_count,
        featuredBookSeries: bookData.featured_book_series
          ? {
              id: bookData.featured_book_series.id,
              book: {
                id: bookData.featured_book_series.book.id,
                title: bookData.featured_book_series.book.title,
                imageUrl: bookData.featured_book_series.book.image.url ?? null,
              },
            }
          : {},
        headline: bookData.headline,
        imageUrl: bookData.image.url ?? null,
        links: bookData.links,
        literaryTypeId: bookData.literary_type_id,
        numberOfPages: bookData.pages,
        releaseDate: bookData.release_date ? new Date(bookData.release_date) : null,
        releaseYear: bookData.release_year,
        slug: bookData.slug,
        state: bookData.state,
        subtitle: bookData.subtitle,
        editions: bookData.editions
          ? bookData.editions.map((edition) => ({
              id: edition.id,
              title: edition.title,
              imageUrl: edition.image?.url ?? null,
              language: edition.language?.language ?? null,
            }))
          : [],
        series: bookData.book_series,
      } as HardcoverBookDetails;

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_BOOK_BY_ID.prefix(hardcoverId),
        book,
        CACHE_KEYS.HARDCOVER_BOOK_BY_ID.expiration,
      );

      return book;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch book details from Hardcover API for book ID ${hardcoverId}: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
    }
  }
}
