import { ApiProperty } from "@nestjs/swagger";
import { CoinReason } from "@prisma/generated/enums";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class GrantCoinsDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsEnum(CoinReason)
  @IsNotEmpty()
  @ApiProperty({ enum: CoinReason })
  readonly reason: CoinReason;

  // Chave de idempotência, mesma ideia do XpLedger.
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly sourceKey: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty()
  readonly amount: number;

  @IsOptional()
  readonly metadata?: Record<string, any>;
}
