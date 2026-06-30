import { IsNotEmpty, IsUUID } from "class-validator";

export class ResetTVShowTrackingDto {
  @IsNotEmpty()
  @IsUUID()
  readonly tvShowId: string;

  readonly userId: string;
}
