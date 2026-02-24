import { IsInt } from "class-validator";

export class RefreshMangaDto {
	@IsInt()
	readonly id: number;
}
