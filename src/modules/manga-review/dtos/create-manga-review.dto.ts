import {
	IsBoolean,
	IsDecimal,
	IsNotEmpty,
	IsOptional,
	Max,
	MaxLength,
	Min,
} from "class-validator";

export class CreateMangaReviewDto {
	@IsDecimal()
	@Max(10)
	@Min(0)
	readonly overall: number;

	@IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly art?: number;

	@IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly worldbuilding?: number;

	@IsOptional()
	@MaxLength(50)
	readonly summary?: string;

	@IsOptional()
	@MaxLength(500)
	readonly notes?: string;

	@IsOptional()
	@MaxLength(500)
	readonly story?: string;

	@IsOptional()
	readonly characters?: string;

	@IsBoolean()
	@IsOptional()
	readonly recommended?: boolean;

	@IsNotEmpty()
	readonly mangaId: string;

	readonly userId: string;
}
