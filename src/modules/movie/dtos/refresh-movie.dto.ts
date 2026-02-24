import { IsInt } from "class-validator";

export class RefreshMovieDto {
	@IsInt()
	readonly id: number;
}
