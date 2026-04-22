import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_ITEMS_PER_PAGE, DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { CacheService } from "../cache/cache.service";

export interface HardcoverPagination<I> {
  total: number | null;
  pages: number | null;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum HardcoverBookFilter {
  Trending = "trending",
  ComingSoon = "comingSoon",
}

export enum HardcoverBookOrderBy {
  Title = "title",
  ReleaseDate = "release_date",
  Rating = "rating",
}

export enum HardcoverSort {
  Desc = "desc",
  Asc = "asc",
}

export interface HardcoverSearchBookOptions {
  query?: string;
  page?: number;
  sort?: HardcoverSort;
  orderBy?: HardcoverBookOrderBy;
  year?: string;
  status?: string;
  categories?: string[];
}

export interface HardcoverTopBookOptions {
  page?: number;
  filter?: HardcoverBookFilter;
}

export interface HardcoverSearchBookResult {
  hardcoverId: number;
  hardcoverReviewScore?: number;
  title: string;
  contributions: string[];
  imageUrl: string;
  tags: HardcoverBookTag[];
  category: string | null;
  releaseDate: Date | null;
  description: string | null;
}

export interface HardcoverTopBookResult {
  hardcoverId: number;
  title: string;
  alternativeTitles: string[];
  authors: { name: string; id: number }[];
  imageUrl: string;
}

export interface HardcoverBookEdition {
  id: number;
  title: string;
  imageUrl: string | null;
  language: string | null;
  publisher: string | null;
  numberOfPages: number | null;
  isbn10: string | null;
  isbn13: string | null;
  releaseYear: number | null;
  releaseDate: Date | null;
  editionFormat: string | null;
}

export interface HardcoverBookSeries {
  position: number | null;
  id: number;
  book: {
    id: number;
    imageUrl: string | null;
    title: string;
  };
  details: string | null;
  featured: boolean;
  series: {
    name: string;
    id: number;
    state: string;
    isCompleted: boolean;
    description: string | null;
  };
} 

export interface HardcoverBookCategory {
  id: number;
  name: string;
}

export interface HardcoverBookStatus {
  id: number;
  name: string;
}

export interface HardcoverBookTag {
  id: number;
  tag: string;
}

export interface HardcoverBookDetails {
  hardcoverId: number;
  title: string;
  alternativeTitles: string[] | null;
  audioSeconds: number | null;
  taggings: HardcoverBookTag[];
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
      imageUrl: string | null;
    };
  }[];
  canonical: {
    id: number;
    imageUrl: string | null;
    title: string;
  } | null;
  compilation: boolean | null;
  curationStatus: unknown;
  defaultAudioEdition: HardcoverBookEdition | null;
  defaultCoverEdition: HardcoverBookEdition | null;
  defaultEbookEdition: HardcoverBookEdition | null;
  defaultPhysicalEdition: (HardcoverBookEdition & { alternativeTitles: string[] | null }) | null;
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
  editions: HardcoverBookEdition[];
  bookSeries: HardcoverBookSeries[];
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

  async searchBooks({
    query,
    page = DEFAULT_PAGINATION_PAGE,
    orderBy = HardcoverBookOrderBy.Rating,
    sort = HardcoverSort.Desc,
    year,
    categories,
    status,
  }: HardcoverSearchBookOptions): Promise<HardcoverPagination<HardcoverSearchBookResult>> {
    try {
      const cachedBooksKey = CACHE_KEYS.HARDCOVER_SEARCH_BOOKS.prefix({
        query,
        page,
        orderBy,
        sort,
        year,
        categories: categories?.join(",") ?? null,
        status,
      });

      // const cachedBooks = await this.cacheService.get<HardcoverPagination<HardcoverSearchBookResult>>(cachedBooksKey);

      // if (cachedBooks) {
      //   return cachedBooks;
      // }

      const limit = DEFAULT_PAGINATION_ITEMS_PER_PAGE;
      const offset = (page - 1) * limit;
      
      let searchData: any = null;
      
      if (query) {
        const searchResponse = await firstValueFrom(
          this.httpService.post(
            this.HARDCOVER_API_URL,
            {
              query: `
              {
                search(
                  query: "${query ? query : ""}",
                  query_type: "book",
                  per_page: ${limit},
                  page: ${offset},
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

        searchData = searchResponse?.data?.data?.search?.results;
      }

      const bookCategories = await this.getBookCategories();
      
      const hitIds: number[] = searchData?.hits?.map((hit: any) => Number(hit.document.id)) ?? [];

      const whereConditions = [
        query ? `
          _or: [
            { id: { _in: [${hitIds.join(", ")}] } },
            { canonical_id: { _in: [${hitIds.join(", ")}] } }
          ]
        ` : null,
        year ? `release_year: { _eq: ${year} }` : null,
        status ? `book_status: { name: { _eq: "${status}" } }` : null,
        categories ? `book_category_id: { _in: [${bookCategories.filter((bc) => categories.includes(bc.name)).map((bc) => bc.id).join(", ")}] }` : null,
      ].filter(Boolean);
      
      const whereClause = whereConditions.length ? `where: { ${whereConditions.join(" , ")} }` : "";

      const booksResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            query: `
						{
							books(
								limit: ${limit},
								offset: ${offset},
                order_by: { ${orderBy}: ${sort} },
                ${whereClause}
							) {
								id
                canonical_id
                title
                image {
                  url
                }
                rating
                contributions {
                  author {
                    id
                    name
                  }
                }
                taggings {
                  tag {
                    id
                    tag
                  }
                }
                description
                release_date
                book_category_id
                canonical {
                  id
                  title
                  image {
                    url
                  }
                  rating
                  contributions {
                    author {
                      id
                      name
                    }
                  }
                  taggings {
                    tag {
                      id
                      tag
                    }
                  }
                  description
                  release_date
                  book_category_id
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

      if (booksResponse.data?.errors) {
        this.logger.error(`Error fetching books from Hardcover API: ${JSON.stringify(booksResponse.data.errors)}`);

        throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
      }

      const booksData = booksResponse?.data?.data?.books;

      const resolved: any[] = (booksData ?? []).map((book: any) => book.canonical ?? book);
      const uniqueBooks: any[] = [...new Map(resolved.map((book: any) => [Number(book.id), book])).values()];

      const items: HardcoverSearchBookResult[] = uniqueBooks.map((book: any) => ({
        hardcoverId: Number(book.id),
        title: book.title,
        description: book.description,
        contributions: book?.contributions?.map(({ author }: any) => author?.name) ?? [],
        hardcoverReviewScore: Math.round(book?.rating ?? 0),
        imageUrl: book.image?.url ?? null,
        tags: [...new Map((book.taggings?.map(({ tag }: any) => tag) ?? []).map((tag: any) => [tag.tag, tag])).values()] as HardcoverBookTag[],
        category: bookCategories.find((bc) => bc.id === book.book_category_id)?.name ?? null,
        releaseDate: book.release_date ? new Date(book.release_date) : null,
      }));

      const books: HardcoverPagination<HardcoverSearchBookResult> = {
        total: null,
        pages: null,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: limit,
        items,
      };

      await this.cacheService.set<HardcoverPagination<HardcoverSearchBookResult>>(
        cachedBooksKey,
        books,
        CACHE_KEYS.HARDCOVER_SEARCH_BOOKS.expiration,
      );

      return books;
    } catch (error: any) {
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
  
  async getBookCategories(): Promise<HardcoverBookCategory[]> {
    try {
      const cachedCategories = await this.cacheService.get<HardcoverBookCategory[]>(CACHE_KEYS.HARDCOVER_BOOK_CATEGORIES.prefix);

      if (cachedCategories) {
        return cachedCategories;
      }

      const categoriesResponse = await firstValueFrom(
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
      
      const categoriesData = categoriesResponse?.data?.data?.book_categories;

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_BOOK_CATEGORIES.prefix,
        categoriesData,
        CACHE_KEYS.HARDCOVER_BOOK_CATEGORIES.expiration,
      );

      return categoriesData;
    } catch (error: any) {
      this.logger.error("Failed to fetch book categories from Hardcover API", error);

      throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
    }
  }
  
  async getBookStatuses(): Promise<HardcoverBookStatus[]> {
    try {
      const cachedStatuses = await this.cacheService.get<HardcoverBookStatus[]>(CACHE_KEYS.HARDCOVER_BOOK_STATUSES.prefix);

      if (cachedStatuses) {
        return cachedStatuses;
      }

      const statusesResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            query: `
						{
              book_statuses {
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
      
      const statusesData = statusesResponse?.data?.data?.book_statuses;

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_BOOK_STATUSES.prefix,
        statusesData,
        CACHE_KEYS.HARDCOVER_BOOK_STATUSES.expiration,
      );

      return statusesData;
    } catch (error: any) {
      this.logger.error("Failed to fetch book statuses from Hardcover API", error);

      throw new AppException(ERROR_CODES.HARDCOVER_SERVICE_UNAVAILABLE);
    }
  }

  async topBooks({
    page = DEFAULT_PAGINATION_PAGE,
    filter = HardcoverBookFilter.Trending,
  }: HardcoverTopBookOptions): Promise<HardcoverPagination<HardcoverTopBookResult>> {
    try {
      const topBooksKey = CACHE_KEYS.HARDCOVER_TOP_BOOKS.prefix({ page, filter });

      const cachedBooks = await this.cacheService.get<HardcoverPagination<HardcoverTopBookResult>>(topBooksKey);

      if (cachedBooks) {
        return cachedBooks;
      }

      const limit = DEFAULT_PAGINATION_ITEMS_PER_PAGE;
      const offset = (page - 1) * limit;

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
              limit: ${limit}
              offset: ${offset}
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
              limit: ${limit}
              offset: ${offset}
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

      const items = responseData.books.map((book) => ({
        hardcoverId: Number(book.id),
        title: book.title,
        alternativeTitles: book.alternative_titles,
        authors: book.contributions?.map(({ author }) => ({ name: author.name, id: author.id })) ?? [],
        imageUrl: book.image?.url ?? "",
        releaseYear: book.release_year,
        description: book.description,
      }));

      const topBooks: HardcoverPagination<HardcoverTopBookResult> = {
        total: null,
        pages: null,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: limit,
        items,
      };

      await this.cacheService.set<HardcoverPagination<HardcoverTopBookResult>>(
        topBooksKey,
        topBooks,
        CACHE_KEYS.HARDCOVER_TOP_BOOKS.expiration,
      );

      return topBooks;
    } catch (error: any) {
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

      const bookResponse = await firstValueFrom(
        this.httpService.post(
          this.HARDCOVER_API_URL,
          {
            variables: { id: hardcoverId },
            query: `
						query GetBookById($id: Int!) {
							books_by_pk(id: $id) {
								audio_seconds
                rating
                book_status {
                  id
                  name
                }
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
                  publisher {
                    name
                  }
                  pages
                  isbn_10
                  isbn_13
                  release_year
                  release_date
                  edition_format
								}
                book_series {
                  position
                  id
                  book {
                    id
                    image {
                      url
                    }
                    title
                  }
                  details
                  featured
                  series {
                    name
                    id
                    state
                    is_completed
                    description
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
      
      const bookCategories = await this.getBookCategories();

      const book = {
        hardcoverId: bookData.id,
        hardcoverReviewScore: Math.round(bookData?.rating ?? 0),
        title: bookData.title,
        alternativeTitles: bookData.alternative_titles,
        audioSeconds: bookData.audio_seconds,
        taggings: [...new Map((bookData.taggings?.map(({ tag }) => tag) ?? []).map((tag) => [tag.tag, tag])).values()],
        bookCategory: bookCategories.find((bc) => bc.id === bookData.book_category_id) ?? null,
        bookStatus: bookData.book_status ? { id: bookData.book_status.id, name: bookData.book_status.name } : null,
        contributions: bookData.contributions ? bookData.contributions.map((contribution) => ({
          contribution: contribution.contribution,
          author: {
            name: contribution.author.name,
            id: contribution.author.id,
            imageUrl: contribution.author.image?.url ?? null,
          },
        })) : [],
        canonical: bookData.canonical ?
          {
            id: bookData.canonical.id,
            imageUrl: bookData.canonical.image.url ?? null,
            title: bookData.canonical.title,
          }
          : null,
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
              publisher: edition.publisher?.name ?? null,
              numberOfPages: edition.pages,
              isbn10: edition.isbn_10,
              isbn13: edition.isbn_13,
              releaseYear: edition.release_year,
              releaseDate: edition.release_date,
              editionFormat: edition.edition_format,
            }))
          : [],
        bookSeries: bookData.book_series
          ? bookData.book_series.map((series) => ({
              position: series.position,
              id: series.id,
              book: {
                id: series.book.id,
                title: series.book.title,
                imageUrl: series.book.image.url ?? null,
              },
              details: series.details,
              featured: series.featured,
              series: {
                name: series.series.name,
                id: series.series.id,
                state: series.series.state,
                isCompleted: series.series.is_completed,
                description: series.series.description,
              },
            }))
          : [],
      } as HardcoverBookDetails;

      await this.cacheService.set(
        CACHE_KEYS.HARDCOVER_BOOK_BY_ID.prefix(hardcoverId),
        book,
        CACHE_KEYS.HARDCOVER_BOOK_BY_ID.expiration,
      );

      return book;
    } catch (error: any) {
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
