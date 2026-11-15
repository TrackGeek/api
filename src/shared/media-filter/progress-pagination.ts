import {
  type DatabaseArgs,
  type DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import type { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { withOverallRatings } from "@/shared/utils/overall-rating";
import type { ProgressFilterParamsDto } from "./dtos/progress-filter.dto";
import { ProgressSortBy, ProgressSortOrder } from "./media-filter.constants";

const REVIEW_FIELDS = {
  animeProgress: ["animeReview", "animeId"],
  mangaProgress: ["mangaReview", "mangaId"],
  movieProgress: ["movieReview", "movieId"],
  tvShowProgress: ["tvShowReview", "tvShowId"],
  gameProgress: ["gameReview", "gameId"],
  bookProgress: ["bookReview", "bookId"],
} as const;

type ProgressRow = { id: string; userId: string; status: string };

export async function paginateProgress<A extends DatabaseArgs>(
  database: DatabaseService,
  filters: ProgressFilterParamsDto,
  params: OffsetPaginationParamsDto<A>,
) {
  if (filters.sortBy !== ProgressSortBy.Rating) return database.offsetPagination<A>(params);

  const model = params.model as keyof typeof REVIEW_FIELDS;
  const [reviewModel, idField] = REVIEW_FIELDS[model];
  const progress = database[model] as any;
  const rows: ProgressRow[] = await progress.findMany({
    where: params.where,
    select: { id: true, userId: true, status: true, [idField]: true },
  });
  const rated = await withOverallRatings(database, reviewModel, idField, rows);
  const direction = filters.sortOrder === ProgressSortOrder.Asc ? 1 : -1;
  rated.sort((left, right) => {
    if (left.rating === null && right.rating !== null) return 1;
    if (right.rating === null && left.rating !== null) return -1;
    return ((left.rating ?? 0) - (right.rating ?? 0)) * direction || left.id.localeCompare(right.id);
  });

  const page = params.page ?? DEFAULT_PAGINATION_PAGE;
  const itemsPerPage = params.itemsPerPage ?? DEFAULT_PAGINATION_ITEMS_PER_PAGE;
  const selected = rated.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const { model: _model, page: _page, itemsPerPage: _size, ...query } = params;
  const items: ProgressRow[] = selected.length
    ? await progress.findMany({
        ...query,
        where: { AND: [params.where ?? {}, { id: { in: selected.map((row) => row.id) } }] },
      })
    : [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const orderedItems = selected.map((row) => byId.get(row.id)).filter((row): row is ProgressRow => row !== undefined);

  return {
    total: rated.length,
    pages: Math.ceil(rated.length / itemsPerPage),
    inPage: page,
    itemsInPage: orderedItems.length,
    itemsPerPage,
    items: orderedItems,
  };
}
