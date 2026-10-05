import { IsUUID } from "class-validator";

export class StartAnilistJobDto {
  @IsUUID()
  readonly snapshotId: string;
}
