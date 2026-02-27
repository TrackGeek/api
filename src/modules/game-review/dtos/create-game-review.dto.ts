import {
  IsArray,
	IsBoolean,
	IsDecimal,
	IsNotEmpty,
	IsOptional,
	Max,
	MaxLength,
	Min,
} from "class-validator";

export class CreateGameReviewDto {
	@IsDecimal()
	@Max(10)
	@Min(0)
	readonly overall: number;

	@IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly graphics?: number;

	@IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly sound?: number;
  
  @IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly story?: number;
  
  @IsDecimal()
	@IsOptional()
	@Max(10)
	@Min(0)
	readonly gameplay?: number;
  
  @IsOptional()
  readonly platform?: string;

	@IsOptional()
	@MaxLength(250)
	readonly summary?: string;

	@IsOptional()
	@MaxLength(1000)
	readonly notes?: string;

	@IsBoolean()
	@IsOptional()
	readonly recommended?: boolean;
  
  @IsArray()
  @IsOptional()
  @MaxLength(10, { each: true })
  readonly screenshots?: string[];

	@IsNotEmpty()
	readonly gameId: string;

	readonly userId: string;
}
