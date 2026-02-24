import { IsInt } from "class-validator";

export class RefreshTVShowDto {
	@IsInt()
	readonly id: number;
}
