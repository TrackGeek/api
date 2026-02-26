import { CreateMangaReviewDto } from "./create-manga-review.dto";

export class UpdateMangaReviewDto extends CreateMangaReviewDto {
	readonly mangaReviewId: string;
}
