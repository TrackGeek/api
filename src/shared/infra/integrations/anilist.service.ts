import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "../cache/cache.service";
import { DEFAULT_PAGINATION_ITEMS_PER_PAGE, DEFAULT_PAGINATION_PAGE } from "../database/database.service";

export interface AnilistPagination<I> {
  total: number | null;
  pages: number;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum AnilistMangaType {
  Manga = "manga",
  Novel = "novel",
  LightNovel = "lightnovel",
  OneShot = "oneshot",
  Doujin = "doujin",
  Manhwa = "manhwa",
  Manhua = "manhua",
}

export enum AnilistMangaStatus {
  Publishing = "publishing",
  Complete = "complete",
  Hiatus = "hiatus",
  Discontinued = "discontinued",
  Upcoming = "upcoming",
}

export enum AnilistMangaOrderBy {
  Title = "title",
  StartDate = "start_date",
  EndDate = "end_date",
  Score = "score",
  Popularity = "popularity",
}

export enum AnilistMangaFilter {
  Publishing = "publishing",
  Upcoming = "upcoming",
  ByPopularity = "bypopularity",
  Favorite = "favorite",
}

export enum AnilistSort {
  Desc = "desc",
  Asc = "asc",
}

export interface AnilistSearchMangaOptions {
  page?: number;
  query?: string;
  type?: AnilistMangaType;
  status?: AnilistMangaStatus;
  genres?: string[];
  orderBy?: AnilistMangaOrderBy;
  sort?: AnilistSort;
  year?: string;
}

export interface AnilistTopMangaOptions {
  page?: number;
  type?: AnilistMangaType;
  filter: AnilistMangaFilter;
}

export interface AnilistSearchManga {
  anilistId: number;
  malId: number | null;
  title: string;
  type: string | null;
  publishedFrom: string | null;
  status: string | null;
  anilistScore: number | null;
  synopsis: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  genres: string[];
  isAdult: boolean;
}

export interface AnilistGenre {
  name: string;
}

export interface AnilistTitle {
  type: string;
  title: string;
}

export interface AnilistDateProp {
  from: string | null;
  to: string | null;
  string: string | null;
}

export interface AnilistStaff {
  anilistId: number;
  name: string;
  role: string | null;
  imageUrl: string | null;
}

export interface AnilistCharacter {
  anilistId: number;
  name: string;
  imageUrl: string | null;
  role: string | null;
}

export interface AnilistStaffMedia {
  anilistId: number;
  malId: number | null;
  type: "ANIME" | "MANGA";
  title: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  startDate: string | null;
  year: number | null;
  roles: string[];
  anilistScore: number | null;
  popularity: number | null;
  isAdult: boolean;
}

export interface AnilistStaffDetails {
  anilistId: number;
  name: string;
  nativeName: string | null;
  alternativeNames: string[];
  imageUrl: string | null;
  description: string | null;
  primaryOccupations: string[];
  gender: string | null;
  dateOfBirth: string | null;
  dateOfDeath: string | null;
  age: number | null;
  yearsActive: number[];
  homeTown: string | null;
  bloodType: string | null;
  url: string | null;
  favoritesCount: number | null;
  media: AnilistStaffMedia[];
}

export interface AnilistRelationNode {
  id: string;
  name: string;
  image: string;
  link: string;
  relationShip: string;
}

export interface AnilistRelationEdge {
  id: string;
  source: string;
  target: string;
}

export interface AnilistRelations {
  nodes: AnilistRelationNode[];
  edges: AnilistRelationEdge[];
}

export interface AnilistMangaDetails extends AnilistSearchManga {
  url: string;
  titles: AnilistTitle[];
  source: string | null;
  countryOfOrigin: string | null;
  numberOfChapters: number | null;
  numberOfVolumes: number | null;
  published: AnilistDateProp;
  popularity: number | null;
  favoritesCount: number | null;
  authors: AnilistStaff[];
  serializations: AnilistStaff[];
  genres: string[];
  tags: string[];
  themes: string[];
  demographics: string[];
  external: { name: string; url: string }[];
  characters: AnilistCharacter[];
  relations: AnilistRelations;
}

const FORMAT_BY_TYPE: Record<AnilistMangaType, string> = {
  [AnilistMangaType.Manga]: "MANGA",
  [AnilistMangaType.Novel]: "NOVEL",
  [AnilistMangaType.LightNovel]: "NOVEL",
  [AnilistMangaType.OneShot]: "ONE_SHOT",
  [AnilistMangaType.Doujin]: "MANGA",
  [AnilistMangaType.Manhwa]: "MANGA",
  [AnilistMangaType.Manhua]: "MANGA",
};

const COUNTRY_BY_TYPE: Partial<Record<AnilistMangaType, string>> = {
  [AnilistMangaType.Manga]: "JP",
  [AnilistMangaType.Manhwa]: "KR",
  [AnilistMangaType.Manhua]: "CN",
};

const STATUS_BY_FILTER: Record<AnilistMangaStatus, string> = {
  [AnilistMangaStatus.Publishing]: "RELEASING",
  [AnilistMangaStatus.Complete]: "FINISHED",
  [AnilistMangaStatus.Hiatus]: "HIATUS",
  [AnilistMangaStatus.Discontinued]: "CANCELLED",
  [AnilistMangaStatus.Upcoming]: "NOT_YET_RELEASED",
};

const SORT_BY_ORDER_BY: Record<AnilistMangaOrderBy, string> = {
  [AnilistMangaOrderBy.Title]: "TITLE_ROMAJI",
  [AnilistMangaOrderBy.StartDate]: "START_DATE",
  [AnilistMangaOrderBy.EndDate]: "END_DATE",
  [AnilistMangaOrderBy.Score]: "SCORE",
  [AnilistMangaOrderBy.Popularity]: "POPULARITY",
};

const STATUS_LABELS: Record<string, string> = {
  RELEASING: "Publishing",
  FINISHED: "Finished",
  NOT_YET_RELEASED: "Not yet published",
  CANCELLED: "Discontinued",
  HIATUS: "On Hiatus",
};

const FORMAT_LABELS: Record<string, string> = {
  MANGA: "Manga",
  NOVEL: "Light Novel",
  ONE_SHOT: "One-shot",
};

const DEMOGRAPHIC_TAGS = ["Shounen", "Shoujo", "Seinen", "Josei", "Kids"];

const MEDIA_FIELDS = `
  id
  idMal
  siteUrl
  type
  format
  status(version: 2)
  description(asHtml: false)
  startDate { year month day }
  endDate { year month day }
  chapters
  volumes
  countryOfOrigin
  source(version: 3)
  isAdult
  averageScore
  popularity
  favourites
  genres
  synonyms
  title { romaji english native }
  coverImage { extraLarge large }
  bannerImage
`;

const MANGA_DETAILS_FIELDS = `
  ${MEDIA_FIELDS}
  tags { name rank isMediaSpoiler }
  externalLinks { site url }
  staff(sort: RELEVANCE, perPage: 12) {
    edges {
      role
      node { id name { full } image { large } }
    }
  }
  characters(sort: [ROLE, FAVOURITES_DESC], perPage: 30) {
    edges {
      role
      node { id name { full } image { large } }
    }
  }
  relations {
    edges {
      relationType(version: 2)
      node {
        id
        idMal
        type
        format
        title { romaji english }
        coverImage { large }
      }
    }
  }
`;

@Injectable()
export class AnilistService {
  private readonly logger = new Logger(AnilistService.name);

  private readonly ANILIST_API_URL = "https://graphql.anilist.co";

  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {}

  async searchMangas({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    type,
    status,
    genres,
    orderBy,
    sort = AnilistSort.Desc,
    year,
  }: AnilistSearchMangaOptions): Promise<AnilistPagination<AnilistSearchManga>> {
    const searchMangaOptions = {
      query,
      page,
      perPage: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
      type,
      status,
      genres: genres ? genres.join(",") : undefined,
      orderBy,
      sort,
      year,
    };

    const searchMangaKey = CACHE_KEYS.ANILIST_SEARCH_MANGAS.prefix({ ...searchMangaOptions });

    const cachedMangas = await this.cacheService.get<AnilistPagination<AnilistSearchManga>>(searchMangaKey);

    if (cachedMangas) {
      return cachedMangas;
    }

    const { genreNames, tagNames } = await this.splitGenresAndTags(genres);

    const data = await this.request<{ Page: any }>(
      `query (
        $page: Int
        $perPage: Int
        $search: String
        $format: MediaFormat
        $countryOfOrigin: CountryCode
        $status: MediaStatus
        $genres: [String]
        $tags: [String]
        $startDateGreater: FuzzyDateInt
        $startDateLesser: FuzzyDateInt
        $sort: [MediaSort]
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total perPage currentPage lastPage }
          media(
            type: MANGA
            search: $search
            format: $format
            countryOfOrigin: $countryOfOrigin
            status: $status
            genre_in: $genres
            tag_in: $tags
            startDate_greater: $startDateGreater
            startDate_lesser: $startDateLesser
            sort: $sort
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }`,
      {
        page,
        perPage: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        search: query || undefined,
        format: type ? FORMAT_BY_TYPE[type] : undefined,
        countryOfOrigin: type ? COUNTRY_BY_TYPE[type] : undefined,
        status: status ? STATUS_BY_FILTER[status] : undefined,
        genres: genreNames.length ? genreNames : undefined,
        tags: tagNames.length ? tagNames : undefined,
        startDateGreater: year ? Number(`${year}0000`) : undefined,
        startDateLesser: year ? Number(`${year}1231`) : undefined,
        sort: this.toMediaSort({ orderBy, sort, hasQuery: !!query }),
      },
    );

    const pageInfo = data.Page.pageInfo;
    const items = (data.Page.media ?? []).map((media: any) => this.toSearchManga(media));

    const mangas: AnilistPagination<AnilistSearchManga> = {
      total: pageInfo.total ?? null,
      pages: pageInfo.lastPage ?? 1,
      inPage: pageInfo.currentPage ?? page,
      itemsInPage: items.length,
      itemsPerPage: pageInfo.perPage ?? DEFAULT_PAGINATION_ITEMS_PER_PAGE,
      items,
    };

    await this.cacheService.set<AnilistPagination<AnilistSearchManga>>(
      searchMangaKey,
      mangas,
      CACHE_KEYS.ANILIST_SEARCH_MANGAS.expiration,
    );

    return mangas;
  }

  async topMangas({
    page = DEFAULT_PAGINATION_PAGE,
    type,
    filter,
  }: AnilistTopMangaOptions): Promise<AnilistPagination<AnilistSearchManga>> {
    const topMangasOptions = { page, perPage: DEFAULT_PAGINATION_ITEMS_PER_PAGE, type, filter };

    const topMangasKey = CACHE_KEYS.ANILIST_TOP_MANGAS.prefix({ ...topMangasOptions });

    const cachedTopMangas = await this.cacheService.get<AnilistPagination<AnilistSearchManga>>(topMangasKey);

    if (cachedTopMangas) {
      return cachedTopMangas;
    }

    const statusByFilter: Partial<Record<AnilistMangaFilter, string>> = {
      [AnilistMangaFilter.Publishing]: "RELEASING",
      [AnilistMangaFilter.Upcoming]: "NOT_YET_RELEASED",
    };

    const data = await this.request<{ Page: any }>(
      `query (
        $page: Int
        $perPage: Int
        $format: MediaFormat
        $countryOfOrigin: CountryCode
        $status: MediaStatus
        $sort: [MediaSort]
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total perPage currentPage lastPage }
          media(
            type: MANGA
            format: $format
            countryOfOrigin: $countryOfOrigin
            status: $status
            sort: $sort
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }`,
      {
        page,
        perPage: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        format: type ? FORMAT_BY_TYPE[type] : undefined,
        countryOfOrigin: type ? COUNTRY_BY_TYPE[type] : undefined,
        status: statusByFilter[filter],
        sort: filter === AnilistMangaFilter.Favorite ? ["FAVOURITES_DESC"] : ["POPULARITY_DESC"],
      },
    );

    const pageInfo = data.Page.pageInfo;
    const items = (data.Page.media ?? []).map((media: any) => this.toSearchManga(media));

    const topMangas: AnilistPagination<AnilistSearchManga> = {
      total: pageInfo.total ?? null,
      pages: pageInfo.lastPage ?? 1,
      inPage: pageInfo.currentPage ?? page,
      itemsInPage: items.length,
      itemsPerPage: pageInfo.perPage ?? DEFAULT_PAGINATION_ITEMS_PER_PAGE,
      items,
    };

    await this.cacheService.set<AnilistPagination<AnilistSearchManga>>(
      topMangasKey,
      topMangas,
      CACHE_KEYS.ANILIST_TOP_MANGAS.expiration,
    );

    return topMangas;
  }

  async getMangaGenres(): Promise<AnilistGenre[]> {
    const cachedGenres = await this.cacheService.get<AnilistGenre[]>(CACHE_KEYS.ANILIST_MANGA_GENRES.prefix);

    if (cachedGenres) {
      return cachedGenres;
    }

    const data = await this.request<{ GenreCollection: string[] }>(`query { GenreCollection }`, {});

    const genres = (data.GenreCollection ?? []).map((name) => ({ name }));

    await this.cacheService.set(
      CACHE_KEYS.ANILIST_MANGA_GENRES.prefix,
      genres,
      CACHE_KEYS.ANILIST_MANGA_GENRES.expiration,
    );

    return genres;
  }

  async getMangaTags(): Promise<AnilistGenre[]> {
    const cachedTags = await this.cacheService.get<AnilistGenre[]>(CACHE_KEYS.ANILIST_MANGA_TAGS.prefix);

    if (cachedTags) {
      return cachedTags;
    }

    const data = await this.request<{ MediaTagCollection: { name: string }[] }>(
      `query { MediaTagCollection { name } }`,
      {},
    );

    const tags = (data.MediaTagCollection ?? []).map(({ name }) => ({ name }));

    await this.cacheService.set(CACHE_KEYS.ANILIST_MANGA_TAGS.prefix, tags, CACHE_KEYS.ANILIST_MANGA_TAGS.expiration);

    return tags;
  }

  async getMangaById(anilistId: number): Promise<AnilistMangaDetails> {
    const cachedManga = await this.cacheService.get<AnilistMangaDetails>(
      CACHE_KEYS.ANILIST_MANGA_BY_ID.prefix(anilistId),
    );

    if (cachedManga) {
      return cachedManga;
    }

    const data = await this.request<{ Media: any }>(
      `query ($id: Int) {
        Media(id: $id, type: MANGA) {
          ${MANGA_DETAILS_FIELDS}
        }
      }`,
      { id: anilistId },
    );

    return this.cacheMangaDetails(data.Media);
  }

  async getMangaByMalId(malId: number): Promise<AnilistMangaDetails> {
    const data = await this.request<{ Media: any }>(
      `query ($idMal: Int) {
        Media(idMal: $idMal, type: MANGA) {
          ${MANGA_DETAILS_FIELDS}
        }
      }`,
      { idMal: malId },
    );

    return this.cacheMangaDetails(data.Media);
  }

  async getMangaRelationsById(anilistId: number): Promise<AnilistRelations> {
    const manga = await this.getMangaById(anilistId);

    return manga.relations;
  }

  async getStaffById(anilistId: number): Promise<AnilistStaffDetails> {
    const cachedStaff = await this.cacheService.get<AnilistStaffDetails>(
      CACHE_KEYS.ANILIST_STAFF_BY_ID.prefix(anilistId),
    );

    if (cachedStaff) {
      return cachedStaff;
    }

    const data = await this.request<{ Staff: any }>(
      `query ($id: Int) {
        Staff(id: $id) {
          id
          name { full native alternative }
          image { large }
          description(asHtml: false)
          primaryOccupations
          gender
          dateOfBirth { year month day }
          dateOfDeath { year month day }
          age
          yearsActive
          homeTown
          bloodType
          siteUrl
          favourites
          staffMedia(sort: POPULARITY_DESC, perPage: 50) {
            edges {
              staffRole
              node {
                id
                idMal
                type
                isAdult
                averageScore
                popularity
                title { romaji english native }
                coverImage { extraLarge large }
                bannerImage
                startDate { year month day }
              }
            }
          }
        }
      }`,
      { id: anilistId },
    );

    if (!data.Staff) {
      throw new AppException(ERROR_CODES.PERSON_NOT_FOUND);
    }

    const staff = this.toStaffDetails(data.Staff);

    await this.cacheService.set(
      CACHE_KEYS.ANILIST_STAFF_BY_ID.prefix(staff.anilistId),
      staff,
      CACHE_KEYS.ANILIST_STAFF_BY_ID.expiration,
    );

    return staff;
  }

  private async cacheMangaDetails(media: any): Promise<AnilistMangaDetails> {
    if (!media) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    const manga = this.toMangaDetails(media);

    await this.cacheService.set(
      CACHE_KEYS.ANILIST_MANGA_BY_ID.prefix(manga.anilistId),
      manga,
      CACHE_KEYS.ANILIST_MANGA_BY_ID.expiration,
    );

    return manga;
  }

  /** AniList exposes broad genres and granular tags separately — user-picked names can be either. */
  private async splitGenresAndTags(genres?: string[]) {
    if (!genres?.length) {
      return { genreNames: [] as string[], tagNames: [] as string[] };
    }

    const availableGenres = await this.getMangaGenres().catch(() => [] as AnilistGenre[]);
    const genreSet = new Set(availableGenres.map((genre) => genre.name.toLowerCase()));

    const genreNames = genres.filter((genre) => genreSet.has(genre.toLowerCase()));
    const tagNames = genres.filter((genre) => !genreSet.has(genre.toLowerCase()));

    return { genreNames, tagNames };
  }

  private toMediaSort({
    orderBy,
    sort,
    hasQuery,
  }: {
    orderBy?: AnilistMangaOrderBy;
    sort: AnilistSort;
    hasQuery: boolean;
  }) {
    if (!orderBy) {
      return hasQuery ? ["SEARCH_MATCH"] : ["POPULARITY_DESC"];
    }

    const mediaSort = SORT_BY_ORDER_BY[orderBy];

    return [sort === AnilistSort.Desc ? `${mediaSort}_DESC` : mediaSort];
  }

  private toSearchManga(media: any): AnilistSearchManga {
    return {
      anilistId: media.id,
      malId: media.idMal ?? null,
      title: this.toTitle(media),
      type: this.toType(media),
      publishedFrom: this.toDate(media.startDate),
      status: STATUS_LABELS[media.status] ?? null,
      anilistScore: media.averageScore ? media.averageScore / 10 : null,
      synopsis: this.toPlainText(media.description),
      imageUrl: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
      bannerUrl: media.bannerImage ?? null,
      genres: media.genres ?? [],
      isAdult: !!media.isAdult,
    };
  }

  private toMangaDetails(media: any): AnilistMangaDetails {
    const tags = (media.tags ?? []).filter((tag: any) => !tag.isMediaSpoiler).map((tag: any) => tag.name as string);
    const demographics = tags.filter((tag: string) => DEMOGRAPHIC_TAGS.includes(tag));

    const staffEdges = media.staff?.edges ?? [];
    const isAuthorRole = (role: string | null) => !role || /story|art/i.test(role);

    return {
      ...this.toSearchManga(media),
      url: media.siteUrl,
      titles: this.toTitles(media),
      source: media.source ?? null,
      countryOfOrigin: media.countryOfOrigin ?? null,
      numberOfChapters: media.chapters ?? null,
      numberOfVolumes: media.volumes ?? null,
      published: {
        from: this.toDate(media.startDate),
        to: this.toDate(media.endDate),
        string: this.toDateRange(media),
      },
      popularity: media.popularity ?? null,
      favoritesCount: media.favourites ?? null,
      authors: staffEdges
        .filter((edge: any) => isAuthorRole(edge.role))
        .map((edge: any) => ({
          anilistId: edge.node.id,
          name: edge.node.name?.full,
          role: edge.role ?? null,
          imageUrl: edge.node.image?.large ?? null,
        })),
      serializations: staffEdges
        .filter((edge: any) => !isAuthorRole(edge.role))
        .map((edge: any) => ({
          anilistId: edge.node.id,
          name: edge.node.name?.full,
          role: edge.role ?? null,
          imageUrl: edge.node.image?.large ?? null,
        })),
      tags,
      themes: tags.filter((tag: string) => !demographics.includes(tag)).slice(0, 10),
      demographics,
      external: (media.externalLinks ?? []).map((link: any) => ({ name: link.site, url: link.url })),
      characters: (media.characters?.edges ?? []).map((edge: any) => ({
        anilistId: edge.node.id,
        name: edge.node.name?.full,
        imageUrl: edge.node.image?.large ?? null,
        role: edge.role ?? null,
      })),
      relations: this.toRelations(media),
    };
  }

  private toStaffDetails(staff: any): AnilistStaffDetails {
    const byId = new Map<number, AnilistStaffMedia>();

    for (const edge of staff.staffMedia?.edges ?? []) {
      const node = edge.node;
      const role = edge.staffRole ?? null;
      const existing = byId.get(node.id);

      if (existing) {
        if (role && !existing.roles.includes(role)) {
          existing.roles.push(role);
        }

        continue;
      }

      byId.set(node.id, {
        anilistId: node.id,
        malId: node.idMal ?? null,
        type: node.type,
        title: this.toTitle(node),
        imageUrl: node.coverImage?.extraLarge ?? node.coverImage?.large ?? null,
        bannerUrl: node.bannerImage ?? null,
        startDate: this.toDate(node.startDate),
        year: node.startDate?.year ?? null,
        roles: role ? [role] : [],
        anilistScore: node.averageScore ? node.averageScore / 10 : null,
        popularity: node.popularity ?? null,
        isAdult: !!node.isAdult,
      });
    }

    return {
      anilistId: staff.id,
      name: staff.name?.full ?? staff.name?.native ?? "",
      nativeName: staff.name?.native ?? null,
      alternativeNames: (staff.name?.alternative ?? []).filter(Boolean),
      imageUrl: staff.image?.large ?? null,
      description: this.toStaffMarkdown(staff.description),
      primaryOccupations: staff.primaryOccupations ?? [],
      gender: staff.gender ?? null,
      dateOfBirth: this.toDate(staff.dateOfBirth),
      dateOfDeath: this.toDate(staff.dateOfDeath),
      age: staff.age ?? null,
      yearsActive: staff.yearsActive ?? [],
      homeTown: staff.homeTown ?? null,
      bloodType: staff.bloodType ?? null,
      url: staff.siteUrl ?? null,
      favoritesCount: staff.favourites ?? null,
      media: [...byId.values()],
    };
  }

  private toRelations(media: any): AnilistRelations {
    const rootId = String(media.id);

    const nodes: AnilistRelationNode[] = [
      {
        id: rootId,
        name: this.toTitle(media),
        image: media.coverImage?.extraLarge ?? media.coverImage?.large ?? "",
        link: `/manga/${media.id}`,
        relationShip: "Now",
      },
    ];

    const edges: AnilistRelationEdge[] = [];

    for (const edge of media.relations?.edges ?? []) {
      const node = edge.node;
      const link = node.type === "ANIME" ? (node.idMal ? `/anime/${node.idMal}` : null) : `/manga/${node.id}`;

      if (!link) continue;

      const id = String(node.id);

      nodes.push({
        id,
        name: node.title?.english ?? node.title?.romaji ?? "",
        image: node.coverImage?.large ?? "",
        link,
        relationShip: this.toRelationLabel(edge.relationType),
      });

      edges.push({ id: `${rootId}-${id}`, source: rootId, target: id });
    }

    return { nodes, edges };
  }

  private toRelationLabel(relationType: string | null) {
    if (!relationType) return "Other";

    return relationType
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private toTitle(media: any) {
    return media.title?.english ?? media.title?.romaji ?? media.title?.native ?? "";
  }

  private toTitles(media: any): AnilistTitle[] {
    const titles = [
      { type: "Default", title: this.toTitle(media) },
      { type: "English", title: media.title?.english },
      { type: "Romaji", title: media.title?.romaji },
      { type: "Native", title: media.title?.native },
      ...(media.synonyms ?? []).map((synonym: string) => ({ type: "Synonym", title: synonym })),
    ];

    return titles.filter((title): title is AnilistTitle => !!title.title);
  }

  private toType(media: any) {
    if (media.format === "MANGA") {
      if (media.countryOfOrigin === "KR") return "Manhwa";
      if (media.countryOfOrigin === "CN") return "Manhua";
    }

    return FORMAT_LABELS[media.format] ?? media.format ?? null;
  }

  private toDate(fuzzyDate: { year: number | null; month: number | null; day: number | null } | null) {
    if (!fuzzyDate?.year) return null;

    return new Date(Date.UTC(fuzzyDate.year, (fuzzyDate.month ?? 1) - 1, fuzzyDate.day ?? 1)).toISOString();
  }

  private toDateRange(media: any) {
    const format = (fuzzyDate: any) => {
      if (!fuzzyDate?.year) return null;

      return new Date(Date.UTC(fuzzyDate.year, (fuzzyDate.month ?? 1) - 1, fuzzyDate.day ?? 1)).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", ...(fuzzyDate.day ? { day: "numeric" } : {}), timeZone: "UTC" },
      );
    };

    const from = format(media.startDate);

    if (!from) return media.status === "NOT_YET_RELEASED" ? "Not yet published" : null;

    const to = format(media.endDate) ?? (media.status === "FINISHED" ? "?" : "Present");

    return `${from} to ${to}`;
  }

  private toStaffMarkdown(description: string | null) {
    if (!description) return null;

    return description
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/~!|!~/g, "")
      .replace(/img\d*%?\(([^)]+)\)/gi, "![]($1)")
      .replace(/youtube\(([^)]+)\)/gi, "[YouTube]($1)")
      .trim();
  }

  private toPlainText(description: string | null) {
    if (!description) return null;

    return description
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.ANILIST_API_URL,
          { query, variables },
          { headers: { "Content-Type": "application/json", Accept: "application/json" } },
        ),
      );

      if (!response.data?.data) {
        throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);
      }

      return response.data.data as T;
    } catch (error: any) {
      if (error instanceof AppException) {
        throw error;
      }

      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
      }

      this.logger.error("Failed to fetch data from AniList API", error);

      throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);
    }
  }
}
