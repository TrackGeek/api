import { PartialType } from "@nestjs/swagger";
import { CreateMissionDto } from "./create-mission.dto";

export class UpdateMissionDto extends PartialType(CreateMissionDto) {}
